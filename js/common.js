document.addEventListener("DOMContentLoaded", function() {
  'use strict';

  const html = document.querySelector('html'),
        globalWrap = document.querySelector('.global-wrap'),
        body = document.querySelector('body'),
        menuToggle = document.querySelector(".hamburger"),
        menuList = document.querySelector(".main-nav"),
        toggleTheme = document.querySelector(".toggle-theme"),
        testimonialsSlider = document.querySelector(".testimonials__slider"),
        overlay = document.querySelector('.overlay');

  /* =======================================================
     Menu + Theme Switcher
  ======================================================= */
  menuToggle.addEventListener("click", () => { menu(); });

  function menu() {
    menuToggle.classList.toggle("is-open");
    menuList.classList.toggle("is-visible");
  }

  // Theme Switcher
  if (toggleTheme) {
    toggleTheme.addEventListener("click", () => {
      darkMode();
      stopAnimation();
    });
  }

  function darkMode() {
    if (html.classList.contains('dark-mode')) {
      html.classList.remove('dark-mode');
      localStorage.removeItem("theme");
      document.documentElement.removeAttribute("dark");
    } else {
      html.classList.add('dark-mode');
      localStorage.setItem("theme", "dark");
      document.documentElement.setAttribute("dark", "");
    }
  }

  /* ================================================================
     Stop Animations During Window Resizing and Theme Switching
  ================================================================ */
  let disableTransition;
  window.addEventListener("resize", () => { stopAnimation(); });
  function stopAnimation() {
    document.body.classList.add("disable-animation");
    clearTimeout(disableTransition);
    disableTransition = setTimeout(() => {
      document.body.classList.remove("disable-animation");
    }, 100);
  }

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
    const images = document.querySelectorAll('.page__content img, .post__content img, .gallery img, .section-gallery img');
    images.forEach(image => {
      if (image.closest('a')) {
        image.classList.add('image-link');
      }
      image.addEventListener('click', e => {
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

  function toggleAccordion(e) {
    e.stopPropagation();
    const faqItem = this.closest('.faq__item');
    const isExpanded = faqItem.getAttribute('aria-expanded') === 'true';
    faqItem.setAttribute('aria-expanded', !isExpanded);
    const description = faqItem.querySelector('.faq__description');
    if (description) {
      if (!isExpanded) {
        description.removeAttribute('hidden');
      } else {
        description.setAttribute('hidden', '');
      }
    }
  }

  faqToggles.forEach(toggle => {
    toggle.addEventListener('click', toggleAccordion);
    toggle.addEventListener('keydown', function(event) {
      if (event.keyCode === 13) {
        toggleAccordion.call(this, event);
      }
    });
  });

  faqItems.forEach(item => {
    item.addEventListener('click', function(e) {
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
  var load_posts_button = document.querySelector('.load-more-posts');
  if (load_posts_button) {
    load_posts_button.addEventListener("click", function(e) {
      e.preventDefault();
      var paginationContainer = document.querySelector(".pagination");
      var url = pagination_next_url.split("/page")[0] + "/page/" + pagination_next_page_number + "/";
      fetch(url)
        .then(function(response) {
          if (response.ok) return response.text();
        })
        .then(function(htmlText) {
          var tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlText;
          var grid = document.querySelector(".grid");
          var articles = tempDiv.querySelectorAll(".article--grid");
          for (var i = 0; i < articles.length; i++) {
            grid.appendChild(articles.item(i));
          }
          new LazyLoad({ elements_selector: ".lazy" });
          pagination_next_page_number++;
          if (pagination_next_page_number > pagination_available_pages_number) {
            paginationContainer.style.display = "none";
          }
        });
    });
  }

  // ===============================
  // VIDEO PLAYBACK HANDLING
  // ===============================
  
  // Determine if the device is touch-enabled
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (isTouchDevice && 'IntersectionObserver' in window) {
    // For touch devices: use IntersectionObserver to play when visible (e.g., user scrolls over it)
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
    document.querySelectorAll('.video-container').forEach(container => {
      observer.observe(container);
    });
  } else {
    // For non-touch devices: use hover events
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
