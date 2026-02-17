(function attachPreviewController(globalScope) {
  const app = (globalScope.PortfolioApp = globalScope.PortfolioApp || {});
  const { SAMPLE_SIZE = 48, VIDEO_PREFETCH_ROOT_MARGIN = "420px 0px" } = app.constants || {};

  class PreviewController {
  constructor(ctx) {
    this.ctx = ctx;
  }

  hydrateVideoSource(video) {
    if (video.dataset.srcHydrated === "1") {
      return false;
    }

    const sourceNodes = Array.from(video.querySelectorAll("source[data-src]"));
    if (sourceNodes.length === 0) {
      video.dataset.srcHydrated = "1";
      return false;
    }

    let didAssignSource = false;
    sourceNodes.forEach((source) => {
      if (!source.src) {
        source.src = source.dataset.src;
        didAssignSource = true;
      }
    });

    video.dataset.srcHydrated = "1";

    if (didAssignSource) {
      video.load();
      return true;
    }

    return false;
  }

  warmVideo(video) {
    const didHydrate = this.hydrateVideoSource(video);
    if (video.preload !== "auto") {
      video.preload = "auto";
    }
    return didHydrate;
  }

  playPreview(video) {
    video.dataset.wantPlay = "1";
    this.warmVideo(video);
    video.play().catch(() => {
      video.addEventListener(
        "canplay",
        () => {
          if (video.dataset.wantPlay === "1") {
            video.play().catch(() => {});
          }
        },
        { once: true }
      );
    });
  }

  pausePreview(video) {
    video.dataset.wantPlay = "0";
    video.pause();
  }

  pauseAllPreviews() {
    for (const { video } of this.ctx.previewCards) {
      this.pausePreview(video);
    }
  }

  syncCardColorFromFrame(card, video, project) {
    const { sampleCtx } = this.ctx;
    if (!sampleCtx || !project) return;

    try {
      sampleCtx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const { data } = sampleCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3] / 255;
        if (alpha < 0.6) continue;
        r += data[i] * alpha;
        g += data[i + 1] * alpha;
        b += data[i + 2] * alpha;
        count += 1;
      }

      if (count === 0) return;

      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);
      const sampledColor = `rgb(${avgR} ${avgG} ${avgB})`;
      card.style.setProperty("--project-card-bg", sampledColor);
      card.style.setProperty(`--${project}-card-bg`, sampledColor);
    } catch (_) {
      // no-op if frame sampling is unavailable
    }
  }

  bindCardHoverEvents() {
    this.ctx.previewCards.forEach(({ card, video, project }) => {
      const sampleVideoFrame = () => {
        if (video.dataset.frameSampled === "1" || video.readyState < 2) {
          return;
        }
        video.pause();
        video.currentTime = 0;
        this.syncCardColorFromFrame(card, video, project);
        video.dataset.frameSampled = "1";
      };

      video.addEventListener("loadeddata", sampleVideoFrame, { once: true });
      if (video.readyState >= 2) {
        sampleVideoFrame();
      }

      card.addEventListener("mouseenter", () => this.playPreview(video));
      card.addEventListener("mouseleave", () => this.pausePreview(video));
    });
  }

  bindIntersectionWarmup() {
    if ("IntersectionObserver" in window) {
      const videoWarmupObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const video = this.ctx.previewVideoByCard.get(entry.target);
            if (!video) return;
            this.warmVideo(video);
            videoWarmupObserver.unobserve(entry.target);
          });
        },
        { root: null, rootMargin: VIDEO_PREFETCH_ROOT_MARGIN, threshold: 0.01 }
      );

      this.ctx.previewCards.forEach(({ card }) => videoWarmupObserver.observe(card));
      return;
    }

    this.ctx.previewCards.forEach(({ video }) => this.warmVideo(video));
  }
  }

  app.PreviewController = PreviewController;
})(window);
