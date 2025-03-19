document.addEventListener("DOMContentLoaded", function() {
  // Hamburger Menu Toggle
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.main-nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function() {
      nav.classList.toggle('open');
    });
  }

  // Search Overlay Toggle
  const searchButton = document.querySelector('.search-button');
  const searchOverlay = document.querySelector('.search');
  const searchClose = document.querySelector('.search__close');
  if (searchButton && searchOverlay) {
    searchButton.addEventListener('click', function() {
      searchOverlay.classList.add('active');
    });
  }
  if (searchClose && searchOverlay) {
    searchClose.addEventListener('click', function() {
      searchOverlay.classList.remove('active');
    });
  }

  // Initialize Carousel if Splide (or similar) is loaded
  if (typeof Splide !== 'undefined') {
    new Splide('#splide01', {
      type: 'loop',
      perPage: 3,
      autoplay: true,
    }).mount();
  }
});
