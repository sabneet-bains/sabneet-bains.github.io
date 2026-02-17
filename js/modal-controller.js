(function attachModalController(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});
  const {
    FALLBACK_MODAL_MS = 420,
    FALLBACK_FOCUS_DELAY_MS = 112,
    RESUME_EYEBROW = "Curriculum Vitae",
    RESUME_TITLE = "Sabneet Bains Resume",
    RESUME_TEMPLATE_ID = "project-resume",
  } = app.constants || {};

  class ModalController {
  constructor(ctx, { onOpen } = {}) {
    this.ctx = ctx;
    this.onOpen = onOpen;

    this.savedPaddingRight = "";
    this.activeCard = null;
    this.lastFocus = null;
    this.modalTeardownTimer = null;
  }

  getModalFadeMs() {
    return app.readMotionMs(this.ctx.root, "--dur-modal-sheet", FALLBACK_MODAL_MS);
  }

  getModalFocusDelayMs() {
    const sheetDelay = app.readMotionMs(this.ctx.root, "--delay-modal-sheet", 56);
    const contentDelay = app.readMotionMs(this.ctx.root, "--delay-modal-content", FALLBACK_FOCUS_DELAY_MS);
    return Math.max(sheetDelay, contentDelay);
  }

  lockRootScroll() {
    const { root } = this.ctx;
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    this.savedPaddingRight = root.style.paddingRight;
    root.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      root.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  unlockRootScroll() {
    const { root } = this.ctx;
    root.style.overflow = "";
    root.style.paddingRight = this.savedPaddingRight;
  }

  setRegionsInert(isInert) {
    this.ctx.appRegions.forEach((region) => {
      if (isInert) {
        region.setAttribute("inert", "");
        region.setAttribute("aria-hidden", "true");
      } else {
        region.removeAttribute("inert");
        region.removeAttribute("aria-hidden");
      }
    });
  }

  getFocusableInModal() {
    return Array.from(this.ctx.modal.querySelectorAll(this.ctx.focusableSelector)).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      return el.getClientRects().length > 0;
    });
  }

  trapFocus(e) {
    if (e.key !== "Tab" || !this.ctx.modal.classList.contains("is-mounted")) return;

    const focusables = this.getFocusableInModal();
    if (focusables.length === 0) {
      e.preventDefault();
      this.ctx.closeBtn.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  clearPendingTeardown() {
    if (!this.modalTeardownTimer) return;
    window.clearTimeout(this.modalTeardownTimer);
    this.modalTeardownTimer = null;
  }

  isBusy() {
    const { modal } = this.ctx;
    return modal.classList.contains("is-mounted") || modal.classList.contains("is-closing");
  }

  setHeader(eyebrow, title) {
    this.ctx.eyebrowEl.textContent = eyebrow || "";
    this.ctx.titleEl.textContent = title || "";
  }

  setVariant(isResume) {
    this.ctx.modalBody.classList.toggle("dialog-modal__body--resume", isResume);
    this.ctx.modal.classList.toggle("dialog-modal--resume", isResume);
  }

  mountTemplate(templateId) {
    this.ctx.modalBody.replaceChildren();
    const template = this.ctx.templateCache.get(templateId);
    if (!template) return;
    this.ctx.modalBody.appendChild(template.content.cloneNode(true));
  }

  enterModalState(triggerEl) {
    const { root, modal, closeBtn } = this.ctx;

    this.lastFocus = triggerEl || document.activeElement;
    root.classList.add("is-modal-opening");
    root.classList.add("has-modal-open");
    modal.classList.add("is-mounted");
    modal.classList.remove("is-closing");
    modal.setAttribute("aria-hidden", "false");

    this.setRegionsInert(true);
    this.lockRootScroll();
    modal.scrollTop = 0;

    window.requestAnimationFrame(() => {
      modal.classList.add("is-visible");
      window.setTimeout(() => closeBtn.focus(), this.getModalFocusDelayMs());
    });
  }

  open(options) {
    if (this.isBusy()) return;
    this.clearPendingTeardown();

    const {
      templateId,
      eyebrow,
      title,
      triggerEl,
      isResume = false,
      expandedCard = null,
    } = options;

    this.setHeader(eyebrow, title);
    this.setVariant(isResume);
    this.mountTemplate(templateId);

    if (expandedCard) {
      this.activeCard = expandedCard;
      this.activeCard.setAttribute("aria-expanded", "true");
    } else {
      this.activeCard = null;
    }

    this.enterModalState(triggerEl);
    if (typeof this.onOpen === "function") {
      this.onOpen();
    }
  }

  openFromCard(card, triggerEl) {
    const project = card.getAttribute("data-project");
    if (!project) return;

    this.open({
      templateId: `project-${project}`,
      eyebrow: card.getAttribute("data-eyebrow") || "",
      title: card.getAttribute("data-title") || "Project",
      triggerEl: triggerEl || card,
      expandedCard: card,
    });
  }

  openResume(triggerEl) {
    this.open({
      templateId: RESUME_TEMPLATE_ID,
      eyebrow: RESUME_EYEBROW,
      title: RESUME_TITLE,
      triggerEl: triggerEl || this.ctx.resumeNavLink,
      isResume: true,
    });
  }

  close() {
    const { root, modal, modalBody } = this.ctx;
    if (!modal.classList.contains("is-mounted") || modal.classList.contains("is-closing")) return;

    root.classList.remove("is-modal-opening");
    root.classList.remove("has-modal-open");
    modal.classList.remove("is-visible");
    modal.classList.add("is-closing");

    if (this.activeCard) {
      this.activeCard.setAttribute("aria-expanded", "false");
      this.activeCard = null;
    }

    this.clearPendingTeardown();
    this.modalTeardownTimer = window.setTimeout(() => {
      modal.classList.remove("is-mounted", "is-closing");
      modal.setAttribute("aria-hidden", "true");
      this.setRegionsInert(false);
      this.unlockRootScroll();
      modalBody.replaceChildren();
      this.setVariant(false);
      if (this.lastFocus instanceof HTMLElement) {
        this.lastFocus.focus();
      }
      this.modalTeardownTimer = null;
    }, this.getModalFadeMs());
  }

  bindEvents() {
    const { closeBtn, backdrop, modal } = this.ctx;

    closeBtn.addEventListener("click", () => this.close());
    backdrop.addEventListener("click", () => this.close());
    modal.addEventListener("keydown", (e) => this.trapFocus(e));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-mounted")) {
        this.close();
      }
    });

    document.addEventListener("focusin", (e) => {
      if (!modal.classList.contains("is-mounted")) return;
      if (modal.contains(e.target)) return;
      closeBtn.focus();
    });
  }
  }

  app.ModalController = ModalController;
})(window);
