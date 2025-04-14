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
     Initial Theme Detection (OS Preference Only)
     -------------------------------------------------------
     Check OS preference via matchMedia and apply the theme.
     Since we’re not persisting any choice, every refresh
     will follow the OS setting.
  ======================================================= */
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) {
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

  // Theme Switcher: On toggle, simply switch the theme.
  if (toggleTheme) {
    toggleTheme.addEventListener("click", () => {
      darkMode();
      stopAnimation();
    });
  }

  const darkMode = () => {
    if (html.classList.contains('dark-mode')) {
      // Switch to light mode (but on next refresh OS preference will override)
      html.classList.remove('dark-mode');
      document.documentElement.removeAttribute("dark");
    } else {
      // Switch to dark mode
      html.classList.add('dark-mode');
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

//   /* =====================================================
//      SVG Animations via the Web Animations API
//      -----------------------------------------------------
//      This section replaces or overrides the CSS animations.
//      Each animated element is defined with its selector and
//      keyframes (matching your original CSS) and then added
//      to an array of animations that are controlled by hover.
//   ===================================================== */
//   const svgElementsConfig = [
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-shoulder-plate_tr',
//       keyframes: [
//         { transform: 'translate(2059.5px,1562px) rotate(0deg)', offset: 0 },
//         { transform: 'translate(2059.5px,1562px) rotate(1deg)', offset: 0.333333 },
//         { transform: 'translate(2059.5px,1562px) rotate(-1deg)', offset: 0.666667 },
//         { transform: 'translate(2059.5px,1562px) rotate(0deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-led',
//       keyframes: [
//         { fill: '#ffc000', offset: 0 },
//         { fill: '#ff7000', offset: 0.333333 },
//         { fill: '#ffc000', offset: 0.666667 },
//         { fill: '#ff7000', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-head_tr',
//       keyframes: [
//         { transform: 'translate(2029.717041px,1148.722198px) rotate(0deg)', offset: 0 },
//         { transform: 'translate(2029.717041px,1148.722198px) rotate(1.5deg)', offset: 0.333333 },
//         { transform: 'translate(2029.717041px,1148.722198px) rotate(0deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-right-ear_ts',
//       keyframes: [
//         { transform: 'translate(2323.72px,1176.22px) scale(1,1)', offset: 0 },
//         { transform: 'translate(2323.72px,1176.22px) scale(1,1)', offset: 0.1 },
//         { transform: 'translate(2323.72px,1176.22px) scale(1.1,1.1)', offset: 0.233333 },
//         { transform: 'translate(2323.72px,1176.22px) scale(1.1,1.1)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-skin_ts',
//       keyframes: [
//         { transform: 'translate(2030.525373px,755.670959px) scale(1,1)', offset: 0 },
//         { transform: 'translate(2030.525373px,755.670959px) scale(1,0.97)', offset: 0.366667 },
//         { transform: 'translate(2030.525373px,755.670959px) scale(1,1)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-mouth',
//       keyframes: [
//         { d: "path('M616.905306,1144.88885C622.942311,1168.374918,662.101854,1174.042747,685.132028,1172.703311C707.374265,1171.409701,729.922604,1162.261279,753.586209,1144.20797')", offset: 0 },
//         { d: "path('M616.905306,1144.88885C638.873347,1163.948792,661.615588,1173.220279,685.132028,1172.703311C707.406469,1172.213646,720.832673,1167.732881,743.585599,1149.20797')", offset: 0.066667 },
//         { d: "path('M616.905306,1144.88885C638.873347,1163.948792,661.615588,1173.220279,685.132028,1172.703311C707.406469,1172.213646,721.237276,1169.351295,737.586209,1152.20797')", offset: 0.133333 },
//         { d: "path('M616.905306,1144.88885C638.873347,1163.948792,661.615588,1173.220279,685.132028,1172.703311C707.406469,1172.213646,722.046483,1170.565105,733.586209,1154.20797')", offset: 0.20 },
//         { d: "path('M616.905306,1144.88885C638.873347,1163.948792,661.615588,1173.220279,685.132028,1172.703311C707.406469,1172.213646,722.85569,1168.137485,731.586209,1155.20797')", offset: 0.266667 },
//         { d: "path('M616.905306,1144.88885C638.873347,1163.948792,661.615588,1173.220279,685.132028,1172.703311C707.406469,1172.213646,722.85569,1168.137485,731.586209,1155.20797')", offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-mouth_to',
//       keyframes: [
//         { transform: 'translate(2040.772475px,1399.390043px)', offset: 0 },
//         { transform: 'translate(2041.722064px,1398.774439px)', offset: 0.266667 },
//         { transform: 'translate(2041.722064px,1398.774439px)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-mouth_tr',
//       keyframes: [
//         { transform: 'rotate(0deg)', offset: 0 },
//         { transform: 'rotate(10deg)', offset: 0.266667 },
//         { transform: 'rotate(10deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-right-eye2',
//       keyframes: [
//         { d: "path('M-0.630236,-17.168464L2.680903,31.412714')", offset: 0 },
//         { d: "path('M-0.630236,-17.168464L2.680903,31.412714')", offset: 0.433333 },
//         { d: "path('M-0.630236,-17.168464L1.680903,24.412714')", offset: 0.5 },
//         { d: "path('M-0.630236,-17.168464L1.680903,17.412714')", offset: 0.566667 },
//         { d: "path('M-0.630236,-17.168464L0.680903,10.412714')", offset: 0.633333 },
//         { d: "path('M-0.630236,-17.168464L-0.458578,-20.01717')", offset: 0.70 },
//         { d: "path('M-0.630236,-17.168464L0.680903,10.412714')", offset: 0.80 },
//         { d: "path('M-0.630236,-17.168464L1.680903,17.412714')", offset: 0.866667 },
//         { d: "path('M-0.630236,-17.168464L1.680903,24.412714')", offset: 0.933333 },
//         { d: "path('M-0.630236,-17.168464L1.680903,24.412714')", offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-right-brow_tr',
//       keyframes: [
//         { transform: 'translate(2208.464723px,1111.039897px) rotate(-10deg)', offset: 0 },
//         { transform: 'translate(2208.464723px,1111.039897px) rotate(-10deg)', offset: 0.433333 },
//         { transform: 'translate(2208.464723px,1111.039897px) rotate(4deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-left-eye2_to',
//       keyframes: [
//         { transform: 'translate(2202px,1140px)', offset: 0 },
//         { transform: 'translate(2222px,1124px)', offset: 0.266667 },
//         { transform: 'translate(2222px,1124px)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-left-brow_to',
//       keyframes: [
//         { transform: 'translate(2202px,1116px)', offset: 0 },
//         { transform: 'translate(2222px,1100px)', offset: 0.266667 },
//         { transform: 'translate(2222px,1100px)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-left-brow_tr',
//       keyframes: [
//         { transform: 'rotate(0deg)', offset: 0 },
//         { transform: 'rotate(20deg)', offset: 0.266667 },
//         { transform: 'rotate(15deg)', offset: 0.666667 },
//         { transform: 'rotate(15deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-pomp-back_tr',
//       keyframes: [
//         { transform: 'translate(1959.380834px,525.26172px) rotate(0deg)', offset: 0 },
//         { transform: 'translate(1959.380834px,525.26172px) rotate(-0.5deg)', offset: 0.6 },
//         { transform: 'translate(1959.380834px,525.26172px) rotate(0.5deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-pomp-back_ts',
//       keyframes: [
//         { transform: 'scale(1,1)', offset: 0 },
//         { transform: 'scale(1,0.97)', offset: 0.366667 },
//         { transform: 'scale(1,1)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-pomp-front_tr',
//       keyframes: [
//         { transform: 'translate(2204.412204px,655.460852px) rotate(0deg)', offset: 0 },
//         { transform: 'translate(2204.412204px,655.460852px) rotate(-4deg)', offset: 0.333333 },
//         { transform: 'translate(2204.412204px,655.460852px) rotate(4deg)', offset: 0.666667 },
//         { transform: 'translate(2204.412204px,655.460852px) rotate(0deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-visor_to',
//       keyframes: [
//         { offsetDistance: '0%', animationTimingFunction: 'cubic-bezier(0,0,0.38,1)', offset: 0 },
//         { offsetDistance: '100%', offset: 0.266667 },
//         { offsetDistance: '100%', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-visor_tr',
//       keyframes: [
//         { transform: 'rotate(0deg)', animationTimingFunction: 'cubic-bezier(0,0,0.5,1)', offset: 0 },
//         { transform: 'rotate(180deg)', offset: 0.266667 },
//         { transform: 'rotate(170deg)', offset: 0.833333 },
//         { transform: 'rotate(180deg)', offset: 1 }
//       ]
//     },
//     {
//       selector: 'svg[viewBox="0 0 1543 1539"] #avatar-u-screen',
//       keyframes: [
//         { fillOpacity: 0.6, offset: 0 },
//         { fillOpacity: 0.4, animationTimingFunction: 'cubic-bezier(0,0,0.58,1)', offset: 0.1 },
//         { fillOpacity: 0.6, offset: 0.3 },
//         { fillOpacity: 0.55, offset: 0.533333 },
//         { fillOpacity: 0.55, offset: 1 }
//       ]
//     }
//   ];

//   // Shared animation options for all SVG elements.
//   const svgAnimationOptions = {
//     duration: 3000,
//     easing: 'linear',
//     iterations: Infinity,
//     direction: 'alternate',
//     fill: 'forwards'
//   };

//   // Array to store Animation objects.
//   const svgAnimations = [];

//   // Create an animation for each configured SVG element.
//   svgElementsConfig.forEach(item => {
//     const element = document.querySelector(item.selector);
//     if (element) {
//       const anim = element.animate(item.keyframes, svgAnimationOptions);
//       // Start paused; JS controls the playback rate.
//       anim.pause();
//       svgAnimations.push(anim);
//     }
//   });

//   // Function to update all SVG animations' playback direction.
//   function updateSvgAnimationsDirection(isHovered) {
//     svgAnimations.forEach(anim => {
//       // Set playback: 1 for forward on hover, -1 for reverse on mouse leave.
//       anim.playbackRate = isHovered ? 1 : -1;
//       // If the animation has finished, reset currentTime to either beginning or end.
//       const totalDuration = anim.effect.getComputedTiming().duration;
//       if (anim.playState === 'finished') {
//         anim.currentTime = isHovered ? 0 : totalDuration;
//       }
//       anim.play();
//     });
//   }

//   // Attach hover event listeners to the #avatar container.
//   const avatar = document.getElementById('avatar');
//   if (avatar) {
//     avatar.addEventListener('mouseenter', () => updateSvgAnimationsDirection(true));
//     avatar.addEventListener('mouseleave', () => updateSvgAnimationsDirection(false));
//   }

// }); // End DOMContentLoaded
