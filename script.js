/* ===================================================
   script.js — Theme Toggle, Mobile Menu, Active Link,
   Scroll Reveal
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

  function setTheme(theme) {
    html.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

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

    links.forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("open");
        navLinks.classList.remove("open");
      });
    });
  }

  // ———————————— Active Link on Scroll ————————————
  if (sections.length && links.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
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
      },
      { root: null, rootMargin: "-40% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((section) => navObserver.observe(section));
  }

  // ———————————— Scroll Reveal ————————————
  const revealEls = document.querySelectorAll(
    ".edu-table__row, .projects-table__row, .skills-list__row"
  );

  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

})();
