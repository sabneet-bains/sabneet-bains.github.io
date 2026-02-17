(function attachMain(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});
  let bootstrapped = false;

  function bootstrap() {
    if (bootstrapped) return;
    if (typeof app.createAppContext !== "function") return;
    if (typeof app.ModalController !== "function") return;
    if (typeof app.PreviewController !== "function") return;

    const ctx = app.createAppContext();
    if (!ctx) return;

    const previews = new app.PreviewController(ctx);
    const modal = new app.ModalController(ctx, {
      onOpen: () => previews.pauseAllPreviews(),
    });

    ctx.cardElements.forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        modal.openFromCard(card, card);
      });

      card.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        modal.openFromCard(card, card);
      });
    });

    if (ctx.resumeNavLink) {
      ctx.resumeNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        modal.openResume(ctx.resumeNavLink);
      });
    }

    previews.bindCardHoverEvents();
    previews.bindIntersectionWarmup();
    modal.bindEvents();
    bootstrapped = true;
  }

  app.bootstrap = bootstrap;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})(window);
