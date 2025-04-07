document.addEventListener("DOMContentLoaded", () => {
  'use strict';

  // Element selectors
  const html = document.querySelector('html'),
        globalWrap = document.querySelector('.global-wrap'),
        body = document.querySelector('body'),
        menuToggle = document.querySelector(".hamburger"),
        menuList = document.querySelector(".main-nav"),
        toggleTheme = document.querySelector(".toggle-theme"),
        testimonialsSlider = document.querySelector(".testimonials__slider"),
        overlay = document.querySelector('.overlay');

  /* =======================================================
     Initial Theme Detection: 
     - Check localStorage for a stored theme preference.
     - Fallback to OS preference using matchMedia.
     - Apply the appropriate theme by adding/removing the dark-mode class
       and setting or removing the "dark" attribute on the html element.
  ======================================================= */
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  // Use stored theme if available; otherwise use OS preference.
  const theme = storedTheme || (prefersDark ? "dark" : "light");

  if (theme === "dark") {
    html.classList.add("dark-mode");
    document.documentElement.setAttribute("dark", "");
  } else {
    html.classList.remove("dark-mode");
    document.documentElement.removeAttribute("dark");
  }

  /* =======================================================
     Menu + Theme Switcher
  ======================================================= */
  menuToggle?.addEventListener("click", () => menu());

  const menu = () => {
    menuToggle.classList.toggle("is-open");
    menuList.classList.toggle("is-visible");
  };

  // Theme Switcher: on toggle, switch theme and persist user choice.
  if (toggleTheme) {
    toggleTheme.addEventListener("click", () => {
      darkMode();
      stopAnimation();
    });
  }

  const darkMode = () => {
    if (html.classList.contains('dark-mode')) {
      // User is switching away from dark mode.
      html.classList.remove('dark-mode');
      localStorage.setItem("theme", "light"); // Optionally, you can remove the item here if you want to fall back on OS preference next time.
      document.documentElement.removeAttribute("dark");
    } else {
      // User selects dark mode.
      html.classList.add('dark-mode');
      localStorage.setItem("theme", "dark");
      document.documentElement.setAttribute("dark", "");
    }
  };

  /* ================================================================
     Stop Animations During Window Resizing and Theme Switching
  ================================================================ */
  let disableTransition;
  window.addEventListener("resize", () => stopAnimation());
  const stopAnimation = () => {
    document.body.classList.add("disable-animation");
    clearTimeout(disableTransition);
    disableTransition = setTimeout(() => {
      document.body.classList.remove("disable-animation");
    }, 100);
  };

  /* =======================
     Responsive Videos
  ======================= */
  reframe(".post__content iframe:not(.reframe-off), .page__content iframe:not(.reframe-off)");

  /* =======================
     LazyLoad Images
  ======================= */
  const lazyLoadInstance = new LazyLoad({ elements_selector: ".lazy" });

  /* =======================
     Zoom Image
  ======================= */
  if (overlay) {
    const images = document.querySelectorAll(
      '.page__content img, .post__content img, .gallery img, .section-gallery img'
    );
    images.forEach(image => {
      // If image is wrapped in a link, mark it as such
      if (image.closest('a')) {
        image.classList.add('image-link');
      }
      image.addEventListener('click', (e) => {
        // Ignore images inside links
        if (image.classList.contains('image-link')) return;
        overlay.classList.add('active');
        const img = document.createElement('img');
        img.src = image.src;
        while (overlay.firstChild) {
          overlay.removeChild(overlay.firstChild);
        }
        overlay.appendChild(img);
      });
    });
    overlay.addEventListener('click', () => {
      overlay.classList.remove('active');
      while (overlay.firstChild) {
        overlay.removeChild(overlay.firstChild);
      }
    });
  }

  /* ============================
     Testimonials Slider
  ============================ */
  if (testimonialsSlider) {
    new Splide(testimonialsSlider, {
      perPage: 2,
      perMove: 1,
      gap: 32,
      arrows: false,
      drag: true,
      pagination: false,
      type: 'loop',
      autoScroll: {
        autoStart: false,
        speed: 0.8,
        pauseOnHover: false,
        pauseOnFocus: false
      },
      intersection: {
        inView: { autoScroll: true },
        outView: { autoScroll: false },
      },
      breakpoints: {
        1024: { perPage: 2 },
        768: { perPage: 1 }
      }
    }).mount(window.splide.Extensions);
  }

  /* =======================
     FAQ Accordion
  ======================= */
  const faqToggles = document.querySelectorAll(".faq .faq__toggle");
  const faqItems = document.querySelectorAll(".faq .faq__item");

  const toggleAccordion = (e) => {
    e.stopPropagation();
    const faqItem = e.currentTarget.closest('.faq__item');
    const isExpanded = faqItem.getAttribute('aria-expanded') === 'true';
    faqItem.setAttribute('aria-expanded', !isExpanded);
    const description = faqItem.querySelector('.faq__description');
    if (description) {
      !isExpanded ? description.removeAttribute('hidden') : description.setAttribute('hidden', '');
    }
  };

  faqToggles.forEach(toggle => {
    toggle.addEventListener('click', toggleAccordion);
    toggle.addEventListener('keydown', (event) => {
      if (event.key === "Enter") toggleAccordion(event);
    });
  });

  faqItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.faq__toggle')) {
        const toggle = item.querySelector('.faq__toggle');
        if (toggle) {
          toggle.click();
        }
      }
    });
  });

  /* =======================
     Load More Posts
  ======================= */
  const loadPostsButton = document.querySelector('.load-more-posts');
  if (loadPostsButton) {
    loadPostsButton.addEventListener("click", async (e) => {
      e.preventDefault();
      const paginationContainer = document.querySelector(".pagination");
      const url = `${pagination_next_url.split("/page")[0]}/page/${pagination_next_page_number}/`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const htmlText = await response.text();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlText;
        const grid = document.querySelector(".grid");
        const articles = tempDiv.querySelectorAll(".article--grid");
        articles.forEach(article => grid.appendChild(article));
        new LazyLoad({ elements_selector: ".lazy" });
        pagination_next_page_number++;
        if (pagination_next_page_number > pagination_available_pages_number) {
          paginationContainer.style.display = "none";
        }
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    });
  }

  /* =====================================
     VIDEO PLAYBACK HANDLING
  ===================================== */
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (isTouchDevice && 'IntersectionObserver' in window) {
    // Touch devices: use IntersectionObserver to control video playback based on visibility.
    const observerOptions = { threshold: 0.5 };
    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        const video = entry.target.querySelector('.video-preview');
        if (!video) return;
        if (entry.intersectionRatio >= 0.5) {
          video.play().catch(err => console.error("Video play failed:", err));
        } else {
          video.pause();
        }
      });
    };
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    document.querySelectorAll('.video-container').forEach(container => observer.observe(container));
  } else {
    // Non-touch devices: control video playback via hover events.
    document.querySelectorAll('.video-container').forEach(container => {
      const video = container.querySelector('.video-preview');
      container.addEventListener('mouseenter', () => {
        video.play().catch(err => console.error("Video play failed:", err));
      });
      container.addEventListener('mouseleave', () => {
        video.pause();
      });
    });
  }
});
