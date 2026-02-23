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

  // ———————————— Neural-Network Background Canvas ————————————
  const canvas = document.getElementById("neuralCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width, height, nodes, animId;
    const NODE_COUNT = 60;
    const CONNECT_DIST = 160;
    const MOUSE_DIST   = 200;
    let mouse = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width  = canvas.width  = rect.width;
      height = canvas.height = rect.height;
    }

    function createNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x:  Math.random() * width,
          y:  Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r:  Math.random() * 2 + 1.5,
        });
      }
    }

    function getColors() {
      const isDark = html.getAttribute("data-theme") === "dark";
      return {
        node: isDark ? "rgba(139,152,232,0.45)" : "rgba(91,106,191,0.3)",
        line: isDark ? "rgba(139,152,232,"       : "rgba(91,106,191,",
        glow: isDark ? "rgba(139,152,232,0.6)"   : "rgba(91,106,191,0.45)",
        glowLine: isDark ? "rgba(139,152,232," : "rgba(91,106,191,",
      };
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const clr = getColors();

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.strokeStyle = clr.line + alpha.toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes + mouse interaction
      for (const n of nodes) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const mDist = Math.sqrt(dx * dx + dy * dy);
        const isNear = mDist < MOUSE_DIST;

        ctx.beginPath();
        ctx.arc(n.x, n.y, isNear ? n.r * 1.8 : n.r, 0, Math.PI * 2);
        ctx.fillStyle = isNear ? clr.glow : clr.node;
        ctx.fill();

        // Draw brighter lines to nearby mouse-highlighted nodes
        if (isNear) {
          for (const m of nodes) {
            if (m === n) continue;
            const ddx = n.x - m.x;
            const ddy = n.y - m.y;
            const d2 = Math.sqrt(ddx * ddx + ddy * ddy);
            const mDist2 = Math.sqrt((m.x - mouse.x) ** 2 + (m.y - mouse.y) ** 2);
            if (d2 < CONNECT_DIST && mDist2 < MOUSE_DIST) {
              const alpha = (1 - d2 / CONNECT_DIST) * 0.4;
              ctx.strokeStyle = clr.glowLine + alpha.toFixed(3) + ")";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(m.x, m.y);
              ctx.stroke();
            }
          }
        }
      }
    }

    function update() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width)  n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
    }

    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    // Track mouse position relative to the hero section
    canvas.parentElement.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    canvas.parentElement.addEventListener("mouseleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    // Only animate when hero is visible (save CPU)
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!animId) loop();
        } else {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    }, { threshold: 0.1 });
    heroObserver.observe(canvas.parentElement);

    window.addEventListener("resize", () => {
      resize();
      createNodes();
    });

    resize();
    createNodes();
    loop();
  }
})();
