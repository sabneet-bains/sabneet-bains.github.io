(function attachDomFactory(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});
  const { SAMPLE_SIZE = 48 } = app.constants || {};

  app.createAppContext = function createAppContext() {
    const root = document.documentElement;

    const modal = document.getElementById("project-modal");
    const modalBody = document.getElementById("modal-body");
    const closeBtn = modal?.querySelector(".dialog-modal__close");
    const backdrop = modal?.querySelector(".dialog-modal__backdrop");
    const eyebrowEl = document.getElementById("modal-eyebrow");
    const titleEl = document.getElementById("modal-title");
    const resumeNavLink = document.querySelector('[data-open="resume-modal"]');

    if (!modal || !modalBody || !closeBtn || !backdrop || !eyebrowEl || !titleEl) {
      return null;
    }

    const appRegions = [
      document.querySelector(".site-header"),
      document.getElementById("main"),
    ].filter(Boolean);

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
    ].join(",");

    const cardElements = Array.from(document.querySelectorAll(".card[data-project]"));
    const previewCards = cardElements
      .map((card) => ({
        card,
        project: card.getAttribute("data-project"),
        video: card.querySelector(".card__media-video"),
      }))
      .filter((item) => item.video && item.project);

    const previewVideoByCard = new Map(previewCards.map(({ card, video }) => [card, video]));

    const templateCache = new Map(
      Array.from(document.querySelectorAll("template[id]")).map((template) => [template.id, template])
    );

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = SAMPLE_SIZE;
    sampleCanvas.height = SAMPLE_SIZE;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    return {
      root,
      modal,
      modalBody,
      closeBtn,
      backdrop,
      eyebrowEl,
      titleEl,
      resumeNavLink,
      appRegions,
      focusableSelector,
      cardElements,
      previewCards,
      previewVideoByCard,
      templateCache,
      sampleCtx,
    };
  };
})(window);
