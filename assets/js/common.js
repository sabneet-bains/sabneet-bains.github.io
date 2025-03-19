// Theme Toggling Script
(function() {
  const defaultTheme = "dark";
  const isToggleEnabled = true;
  const userTheme = localStorage.getItem("theme");

  function setTheme(mode) {
    if (mode === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark-mode");
    } else if (mode === "light") {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark-mode");
    }
  }

  if (isToggleEnabled) {
    if (userTheme) {
      setTheme(userTheme);
    } else {
      setTheme(defaultTheme);
    }
  } else {
    setTheme(defaultTheme);
  }
})();
