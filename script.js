/* ===================================================
   script.js — Theme Toggle, Mobile Menu & Active Link
   =================================================== */

(function () {
  "use strict";

  // ———————————————————— DOM refs ————————————————————
  const html        = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const hamburger   = document.getElementById("hamburger");
  const navLinks    = document.getElementById("navLinks");
  const links       = document.querySelectorAll(".navbar__link");
  const sections    = document.querySelectorAll("section[id]");

  // ———————————————— Theme Toggle ————————————————
  const STORAGE_KEY = "theme";

  /** Apply a theme ("light" | "dark") and persist it. */
  function setTheme(theme) {
    html.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  /** Determine initial theme (stored pref → OS pref → light). */
  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  // Set initial theme immediately (avoids flash)
  setTheme(getInitialTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = html.getAttribute("data-theme");
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  // ———————————————— Mobile Menu ————————————————
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      navLinks.classList.toggle("open");
    });

    // Close mobile menu when a link is clicked
    links.forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("open");
        navLinks.classList.remove("open");
      });
    });
  }

  // ———————————— Active Link on Scroll ————————————
  if (sections.length && links.length) {
    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -60% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          links.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${id}`
            );
          });
        }
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));
  }
})();
