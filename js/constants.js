(function attachConstants(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});
  app.constants = {
    FALLBACK_MODAL_MS: 420,
    FALLBACK_FOCUS_DELAY_MS: 112,
    RESUME_EYEBROW: "Curriculum Vitae",
    RESUME_TITLE: "Sabneet Bains Resume",
    RESUME_TEMPLATE_ID: "project-resume",
    SAMPLE_SIZE: 48,
    VIDEO_PREFETCH_ROOT_MARGIN: "420px 0px",
  };
})(window);
