const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = process.cwd();
const HOST = "127.0.0.1";
const PORT = 4173;
const TARGET_URL = `http://${HOST}:${PORT}/index.html`;

function binPath(name) {
  const ext = process.platform === "win32" ? ".cmd" : "";
  return path.join(ROOT, "node_modules", ".bin", `${name}${ext}`);
}

function waitForServer(url, timeoutMs = 30000, intervalMs = 500) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(3000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, intervalMs);
    };

    tick();
  });
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code || 0));
  });
}

async function main() {
  const env = { ...process.env };
  const server = spawn(binPath("http-server"), [".", "-p", String(PORT), "-c-1"], {
    cwd: ROOT,
    env,
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  try {
    await waitForServer(TARGET_URL);
    const code = await runCommand(binPath("pa11y-ci"), ["--config", ".pa11yci.json"], env);
    process.exitCode = code;
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
      setTimeout(() => {
        if (!server.killed) {
          server.kill("SIGKILL");
        }
      }, 1500);
    }
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
