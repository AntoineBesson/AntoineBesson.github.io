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

  themeToggle.addEventListener("click", () => {
    const current = html.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });

  // ———————————————— Mobile Menu ————————————————
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

  // ———————————— Active Link on Scroll ————————————
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

  // ———————————— Project Card Expand / Collapse ————————————
  const projectCards = document.querySelectorAll(".project-card");

  projectCards.forEach((card) => {
    const toggle = card.querySelector(".project-card__toggle");
    if (!toggle) return;

    function flipCard() {
      const isOpen = card.classList.toggle("open");
      toggle.childNodes[0].textContent = isOpen ? "Hide details " : "View details ";
    }

    // Click anywhere on the card summary or the toggle
    card.querySelector(".project-card__summary").addEventListener("click", flipCard);

    // Keyboard: Enter or Space
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipCard();
      }
    });
  });
})();
