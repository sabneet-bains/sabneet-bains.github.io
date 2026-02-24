const fs = require("fs");
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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function resolveEdgePath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => resolve({ code: code || 0, output }));
  });
}

async function main() {
  const tmpDir = path.join(ROOT, ".lighthouseci", "tmp");
  const profileDir = path.join(ROOT, ".lighthouseci", "chrome-profile");
  ensureDir(tmpDir);
  ensureDir(profileDir);

  const env = { ...process.env };
  env.TMP = tmpDir;
  env.TEMP = tmpDir;
  if (!env.CHROME_PATH) {
    const edgePath = resolveEdgePath();
    if (edgePath) {
      env.CHROME_PATH = edgePath;
      console.log(`Using CHROME_PATH=${edgePath}`);
    }
  }

  const server = spawn(binPath("http-server"), [".", "-p", String(PORT), "-c-1"], {
    cwd: ROOT,
    env,
    shell: process.platform === "win32",
    stdio: "ignore",
  });

  try {
    await waitForServer(TARGET_URL);
    const result = await runCommand(
      binPath("lhci"),
      ["autorun", "--config=lighthouserc.json", "--upload.target=filesystem", "--upload.outputDir=.lighthouseci"],
      env
    );

    if (result.code === 0) {
      return;
    }

    const hasEpermCleanup =
      result.output.includes("EPERM, Permission denied") &&
      result.output.includes("lighthouse.") &&
      result.output.includes("Generating results...");
    const hasAssertionFailure = result.output.includes("assertions failed");

    if (hasEpermCleanup && !hasAssertionFailure) {
      console.warn("Ignoring LHCI Windows cleanup lock (EPERM) after results generation.");
      return;
    }

    process.exitCode = result.code || 1;
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
