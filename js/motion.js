(function attachMotionUtils(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});

  app.parseCssTimeToMs = function parseCssTimeToMs(value) {
    if (!value) return Number.NaN;
    const token = String(value).trim();
    if (token.endsWith("ms")) return Number.parseFloat(token);
    if (token.endsWith("s")) return Number.parseFloat(token) * 1000;
    return Number.parseFloat(token);
  };

  app.readMotionMs = function readMotionMs(root, varName, fallbackMs) {
    const raw = getComputedStyle(root).getPropertyValue(varName);
    const parsed = app.parseCssTimeToMs(raw);
    return Number.isFinite(parsed) ? parsed : fallbackMs;
  };
})(window);
