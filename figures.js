/* ===================================================
   figures.js — animated research figures
   - glimpse : foveated segmentation pipeline (Active Vision)
   - heston  : Heston Monte Carlo paths (Trading Bot)
   - gesture : ST-GCN hand skeleton (NeuroCalc)
   No dependencies. Every loop pauses offscreen and has a
   prefers-reduced-motion path that renders a still frame.
   =================================================== */

(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)); // exponential ease-out
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  // ——— theme colours, re-read when the theme toggles ———
  let theme = {};
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    theme = {
      bg: v("--clr-bg"), bgAlt: v("--clr-bg-alt"), ink: v("--clr-ink"),
      muted: v("--clr-ink-muted"), light: v("--clr-border-light"), accent: v("--clr-accent"),
    };
  }
  readTheme();

  const MONO = '"IBM Plex Mono", ui-monospace, monospace';

  function label(ctx, text, x, y, dpr, opts) {
    const o = opts || {};
    const size = (o.size || 11) * dpr;
    ctx.font = `${o.weight || 500} ${size}px ${MONO}`;
    ctx.textBaseline = "middle";
    const padX = 6 * dpr, h = size + 8 * dpr;
    const w = ctx.measureText(text).width + padX * 2;
    const bx = o.align === "right" ? x - w : x;
    ctx.globalAlpha = o.bgAlpha == null ? 0.88 : o.bgAlpha;
    ctx.fillStyle = o.bg || theme.bg;
    ctx.fillRect(bx, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = o.color || theme.ink;
    ctx.fillText(text, bx + padX, y + h / 2 + 0.5 * dpr);
    return { w, h };
  }

  /* ===================================================
     Procedural street scene — used until real photos load
     =================================================== */
  function drawStreet(ctx, W, H, seed) {
    const r = rng(seed);
    const R = (a, b) => a + (b - a) * r();
    const pick = (a) => a[Math.floor(r() * a.length)];
    const u = W / 400;
    const hz = H * 0.48;
    const vx = W * R(0.44, 0.56);

    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, "#9cb3c6"); g.addColorStop(1, "#e6dccd");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz);

    // far skyline
    let x = -5;
    while (x < W) {
      const w = R(18, 40) * u, h = R(0.1, 0.32) * H;
      ctx.fillStyle = pick(["#8b96a1", "#a2a8ac", "#7b858f", "#b0aaa2", "#968f86"]);
      ctx.fillRect(x, hz - h, w + 1, h);
      ctx.fillStyle = "rgba(255,240,200,0.45)";
      for (let wy = hz - h + 3 * u; wy < hz - 3 * u; wy += 5 * u)
        for (let wx = x + 2 * u; wx < x + w - 3 * u; wx += 4 * u)
          if (r() < 0.25) ctx.fillRect(wx, wy, 1.6 * u, 2.2 * u);
      x += w;
    }

    // ground
    ctx.fillStyle = "#b8b0a5"; ctx.fillRect(0, hz, W, H - hz);
    const ground = (l, s) => [vx + ((W * 0.5 - vx) + l * W * 0.42) * s, hz + (H - hz) * s];
    const road = [ground(-1, 1), ground(1, 1), ground(1, 0.001), ground(-1, 0.001)];
    ctx.fillStyle = "#57534f";
    ctx.beginPath(); road.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill();
    ctx.fillStyle = "#e9e1d2";
    const depth = (t) => 1 / (1 + t * 30); // t in [0,1] near -> far
    for (let i = 0; i < 14; i++) {
      const s0 = depth(i / 14), s1 = depth((i + 0.45) / 14);
      const a = ground(-0.02, s0), b = ground(0.02, s0), c = ground(0.02, s1), d = ground(-0.02, s1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
    }

    // perspective facades
    function facade(side, nearTop, nearBot, far, col) {
      const nx = side < 0 ? 0 : W;
      const P = (t, v) => {
        const s = 1 / (1 + t * (1 / far - 1));
        const px = vx + (nx - vx) * s;
        const top = hz + (nearTop - hz) * s, bot = hz + (nearBot - hz) * s;
        return [px, lerp(top, bot, v)];
      };
      const q = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
      ctx.fillStyle = col;
      ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill();
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) {
        const t0 = i / 9 + 0.02, t1 = (i + 0.6) / 9, v0 = j / 7 + 0.03, v1 = (j + 0.55) / 7;
        if (j === 6) continue;
        const p = [P(t0, v0), P(t1, v0), P(t1, v1), P(t0, v1)];
        ctx.fillStyle = r() < 0.18 ? "#efd9a2" : "#3e4650";
        ctx.beginPath(); p.forEach((pt, k) => (k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.fill();
      }
    }
    facade(-1, -H * 0.1, H * 0.86, 0.3, "#a67c5b");
    facade(1, H * 0.05, H * 0.84, 0.28, "#c9b79c");

    // objects, far to near
    const objs = [];
    for (let i = 0; i < 4; i++) objs.push({ k: "car", s: R(0.18, 0.8), l: pick([-0.5, 0.5]) + R(-0.08, 0.08) });
    for (let i = 0; i < 3; i++) objs.push({ k: "ped", s: R(0.3, 0.9), l: pick([-1.12, 1.12]) + R(-0.05, 0.05) });
    objs.push({ k: "light", s: R(0.35, 0.55), l: 1.3 });
    objs.push({ k: "sign", s: R(0.45, 0.7), l: -1.3 });
    objs.sort((a, b) => a.s - b.s);
    for (const o of objs) {
      const [gx, gy] = ground(o.l, o.s);
      const k = o.s * u;
      if (o.k === "car") {
        const w = 88 * k, h = 46 * k;
        ctx.fillStyle = "#1d1d1d";
        ctx.fillRect(gx - w * 0.42, gy - 7 * k, 14 * k, 7 * k); ctx.fillRect(gx + w * 0.42 - 14 * k, gy - 7 * k, 14 * k, 7 * k);
        ctx.fillStyle = pick(["#c0392b", "#2c3e50", "#ece6da", "#7f8c8d", "#c99a2e", "#34495e"]);
        ctx.fillRect(gx - w / 2, gy - h * 0.62, w, h * 0.56);
        ctx.beginPath(); ctx.moveTo(gx - w * 0.38, gy - h * 0.62); ctx.lineTo(gx - w * 0.28, gy - h); ctx.lineTo(gx + w * 0.28, gy - h); ctx.lineTo(gx + w * 0.38, gy - h * 0.62); ctx.fill();
        ctx.fillStyle = "#2a3138";
        ctx.beginPath(); ctx.moveTo(gx - w * 0.32, gy - h * 0.64); ctx.lineTo(gx - w * 0.25, gy - h * 0.94); ctx.lineTo(gx + w * 0.25, gy - h * 0.94); ctx.lineTo(gx + w * 0.32, gy - h * 0.64); ctx.fill();
        ctx.fillStyle = "#e0402e";
        ctx.fillRect(gx - w * 0.47, gy - h * 0.5, w * 0.1, h * 0.08); ctx.fillRect(gx + w * 0.37, gy - h * 0.5, w * 0.1, h * 0.08);
        ctx.fillStyle = "#e8e2d4"; ctx.fillRect(gx - w * 0.1, gy - h * 0.3, w * 0.2, h * 0.09);
      } else if (o.k === "ped") {
        const h = 62 * k;
        ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = Math.max(1, 5 * k); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(gx - 5 * k, gy); ctx.lineTo(gx, gy - h * 0.45); ctx.lineTo(gx + 5 * k, gy); ctx.stroke();
        ctx.fillStyle = pick(["#c0392b", "#2c6e8f", "#d9a441", "#4b5d3a", "#f0ebe1"]);
        ctx.fillRect(gx - 7 * k, gy - h * 0.82, 14 * k, h * 0.4);
        ctx.fillStyle = "#c79b7d"; ctx.beginPath(); ctx.arc(gx, gy - h * 0.9, 6 * k, 0, TAU); ctx.fill();
      } else if (o.k === "light") {
        const h = 120 * k;
        ctx.fillStyle = "#33383d"; ctx.fillRect(gx - 2 * k, gy - h, 4 * k, h);
        ctx.fillRect(gx - 8 * k, gy - h - 34 * k, 16 * k, 36 * k);
        const lit = Math.floor(r() * 3);
        ["#e0402e", "#e6b33a", "#3fae6a"].forEach((c, i) => {
          ctx.fillStyle = i === lit ? c : "#1c1f22";
          ctx.beginPath(); ctx.arc(gx, gy - h - 28 * k + i * 11 * k, 4 * k, 0, TAU); ctx.fill();
        });
      } else {
        const h = 90 * k;
        ctx.fillStyle = "#6b6f73"; ctx.fillRect(gx - 1.5 * k, gy - h, 3 * k, h);
        ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(gx, gy - h, 13 * k, 0, TAU); ctx.fill();
        ctx.fillStyle = "#f4efe6"; ctx.beginPath(); ctx.arc(gx, gy - h, 9.5 * k, 0, TAU); ctx.fill();
        ctx.fillStyle = "#1a1a1a"; ctx.font = `600 ${10 * k}px ${MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("30", gx, gy - h + 0.5 * k); ctx.textAlign = "left";
      }
    }
  }

  /* ===================================================
     Figure: foveated segmentation pipeline
     =================================================== */
  const GRID_C = 8, GRID_R = 4, K = 4;
  const MODES = {
    full: {
      hud: "Full frame · 100% of pixels",
      note: "Baseline: the backbone sees every pixel of the frame. This is the curve every foveated variant has to beat at equal latency.",
    },
    glimpse: {
      hud: "Context 0.5 + 4 glimpses",
      note: "Method 2: a low-resolution context pass, an uncertainty score per grid cell, then high-resolution glimpses on the top-k cells, written back into the context. Hover the frame to place a glimpse yourself.",
    },
    warp: {
      hud: "Idea · not started",
      note: "Next idea: a single pass on a non-uniformly resampled frame. Uncertain regions get more pixels and the rest is compressed. No crops, no second pass. Not implemented yet.",
    },
  };

  function glimpseFigure(fig) {
    const cv = fig.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const note = fig.querySelector("[data-note]");
    const buttons = Array.from(fig.querySelectorAll("[data-mode]"));
    const srcs = (fig.dataset.images || "").split(",").map((s) => s.trim()).filter(Boolean);

    let W = 0, H = 0, dpr = 1;
    let sources = []; // HTMLImageElement or canvas
    let idx = 0, frame = null, small = null, scores = null, picks = [], warpX = null, warpY = null, tmp = null;
    let mode = "glimpse", t = 0, hover = null;
    const runner = mount(cv, { resize, draw });

    // load photos; fall back to procedural streets if none load
    let pending = srcs.length;
    srcs.forEach((src) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => { sources.push(im); if (--pending === 0) ready(); };
      im.onerror = () => { if (--pending === 0) ready(); };
      im.src = src;
    });
    if (!srcs.length) ready();

    function ready() {
      if (!sources.length) sources = [11, 23, 37].map((s) => ({ seed: s }));
      prepare();
      runner.request();
    }

    function drawSource(c, w, h, s) {
      const x = c.getContext("2d");
      if (s.seed != null) { drawStreet(x, w, h, s.seed); return; }
      const sr = s.naturalWidth / s.naturalHeight, dr = w / h;
      let sw = s.naturalWidth, sh = s.naturalHeight, sx = 0, sy = 0;
      if (sr > dr) { sw = sh * dr; sx = (s.naturalWidth - sw) / 2; } else { sh = sw / dr; sy = (s.naturalHeight - sh) / 2; }
      x.drawImage(s, sx, sy, sw, sh, 0, 0, w, h);
    }

    function prepare() {
      if (!W || !sources.length) return;
      const s = sources[idx % sources.length];
      frame = canvas(W, H); drawSource(frame, W, H, s);
      small = canvas(Math.round(W / 10), Math.round(H / 10));
      small.getContext("2d").drawImage(frame, 0, 0, small.width, small.height);
      tmp = canvas(W, H);
      computeScores();
      computeWarp();
    }

    // Uncertainty proxy: the detail the low-resolution context view loses,
    // pooled per grid cell (the real method uses the context model's entropy).
    function computeScores() {
      const aw = 128, ah = 64;
      const a = canvas(aw, ah), ax = a.getContext("2d");
      ax.drawImage(frame, 0, 0, aw, ah);
      const lo = canvas(aw, ah), lx = lo.getContext("2d");
      const t16 = canvas(16, 8); t16.getContext("2d").drawImage(a, 0, 0, 16, 8);
      lx.imageSmoothingEnabled = true; lx.drawImage(t16, 0, 0, aw, ah);
      scores = new Float32Array(GRID_C * GRID_R);
      try {
        const A = ax.getImageData(0, 0, aw, ah).data, L = lx.getImageData(0, 0, aw, ah).data;
        for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
          const i = (y * aw + x) * 4;
          const d = Math.abs(A[i] - L[i]) + Math.abs(A[i + 1] - L[i + 1]) + Math.abs(A[i + 2] - L[i + 2]);
          scores[Math.floor(y / ah * GRID_R) * GRID_C + Math.floor(x / aw * GRID_C)] += d;
        }
      } catch (e) {
        // tainted canvas (file://): centre-weighted prior instead
        for (let i = 0; i < scores.length; i++) {
          const cx = (i % GRID_C + 0.5) / GRID_C - 0.5, cy = (Math.floor(i / GRID_C) + 0.5) / GRID_R - 0.55;
          scores[i] = Math.exp(-(cx * cx * 6 + cy * cy * 10)) + 0.2 * Math.random();
        }
      }
      const ROW_PRIOR = [0.55, 1, 1, 0.8];
      for (let i = 0; i < scores.length; i++) scores[i] *= ROW_PRIOR[Math.floor(i / GRID_C)] || 1;
      let mx = 0; scores.forEach((v) => (mx = Math.max(mx, v)));
      for (let i = 0; i < scores.length; i++) scores[i] /= mx || 1;
      picks = Array.from(scores.keys()).sort((p, q) => scores[q] - scores[p]).slice(0, K);
    }

    // Separable warp: sampling density follows the per-column / per-row uncertainty.
    function computeWarp() {
      const marg = (n, cells, get) => {
        const dens = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const f = (i / n) * cells - 0.5;
          const a = clamp(Math.floor(f), 0, cells - 1), b = clamp(a + 1, 0, cells - 1);
          const v = lerp(get(a), get(b), clamp(f - a, 0, 1));
          dens[i] = 1 + 2.4 * v * v;
        }
        const cdf = new Float32Array(n + 1);
        for (let i = 0; i < n; i++) cdf[i + 1] = cdf[i] + dens[i];
        const inv = new Float32Array(n + 1);
        let j = 0;
        for (let o = 0; o <= n; o++) {
          const target = (o / n) * cdf[n];
          while (j < n && cdf[j + 1] < target) j++;
          const span = cdf[j + 1] - cdf[j] || 1;
          inv[o] = j + (target - cdf[j]) / span;
        }
        return { inv, cdf };
      };
      const colScore = (c) => { let m = 0; for (let r = 0; r < GRID_R; r++) m = Math.max(m, scores[r * GRID_C + c]); return m; };
      const rowScore = (r) => { let m = 0; for (let c = 0; c < GRID_C; c++) m = Math.max(m, scores[r * GRID_C + c]); return m; };
      warpX = marg(W, GRID_C, colScore);
      warpY = marg(H, GRID_R, rowScore);
    }

    function cellRect(i, margin) {
      const cw = W / GRID_C, ch = H / GRID_R;
      const c = i % GRID_C, r = Math.floor(i / GRID_C);
      const m = margin ? cw * 0.25 : 0;
      const x = clamp(c * cw - m, 0, W), y = clamp(r * ch - m, 0, H);
      return { x, y, w: Math.min(W, c * cw + cw + m) - x, h: Math.min(H, r * ch + ch + m) - y, cx: c * cw + cw / 2, cy: r * ch + ch / 2 };
    }

    function drawContext(alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, W, H);
      ctx.restore();
    }

    function drawGlimpse(rc, p) {
      if (p <= 0) return;
      const e = easeOut(p);
      const w = rc.w * e, h = rc.h * e, x = rc.cx - w / 2 + (rc.x + rc.w / 2 - rc.cx) * e, y = rc.cy - h / 2 + (rc.y + rc.h / 2 - rc.cy) * e;
      ctx.drawImage(frame, x, y, w, h, x, y, w, h);
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    function drawGrid(alpha) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < GRID_C; c++) { const x = Math.round(c * W / GRID_C) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let r = 1; r < GRID_R; r++) { const y = Math.round(r * H / GRID_R) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
    }

    function drawHeat(alpha) {
      if (alpha <= 0) return;
      ctx.save();
      for (let i = 0; i < scores.length; i++) {
        const rc = cellRect(i, false);
        ctx.globalAlpha = alpha * 0.55 * scores[i] * scores[i];
        ctx.fillStyle = theme.accent;
        ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      }
      ctx.restore();
    }

    function reticle(x, y, w, h) {
      const l = Math.min(w, h) * 0.22;
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 2 * dpr; ctx.lineCap = "square";
      ctx.beginPath();
      [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([px, py, sx, sy]) => {
        ctx.moveTo(px + sx * l, py); ctx.lineTo(px, py); ctx.lineTo(px, py + sy * l);
      });
      ctx.stroke();
    }

    function hud(text, sub) {
      const css = W / dpr, size = css < 520 ? 9 : 11, m = (css < 520 ? 6 : 10) * dpr;
      const a = label(ctx, text, m, m, dpr, { weight: 600, size });
      if (sub && css >= 420) label(ctx, sub, m, m + a.h + 2 * dpr, dpr, { color: theme.muted, size });
    }

    const CYCLE = 7600, VISIT = 900, V0 = 1200;

    function pixelFraction() {
      let area = 0.25 * W * H; // context at scale 0.5
      picks.forEach((i) => { const rc = cellRect(i, true); area += rc.w * rc.h; });
      return Math.round((area / (W * H)) * 100);
    }

    function renderGlimpse(tt) {
      const fadeIn = REDUCED || hover != null ? 1 : seg(tt, 0, 400);
      ctx.fillStyle = theme.bgAlt; ctx.fillRect(0, 0, W, H);
      drawContext(fadeIn);
      drawGrid(0.18 * fadeIn);
      const heat = REDUCED || hover != null ? 0.6 : seg(tt, 450, 1100) * (1 - 0.6 * seg(tt, V0 + K * VISIT, V0 + K * VISIT + 600));
      drawHeat(heat);

      if (hover != null) {
        const rc = cellRect(hover, true);
        drawGlimpse(rc, 1);
        reticle(rc.x, rc.y, rc.w, rc.h);
        hud("Your glimpse", `cell ${hover % GRID_C},${Math.floor(hover / GRID_C)} · uncertainty ${scores[hover].toFixed(2)}`);
        return;
      }

      // attention path
      let prev = { x: W / 2, y: H / 2, w: W / GRID_C, h: H / GRID_R };
      const pts = [];
      for (let k = 0; k < picks.length; k++) {
        const s = V0 + k * VISIT;
        const p = REDUCED ? 1 : seg(tt, s + 320, s + 620);
        drawGlimpse(cellRect(picks[k], true), p);
        if (REDUCED || tt >= s) pts.push(cellRect(picks[k], false));
      }
      // path line + numbered fixations
      ctx.save();
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      pts.forEach((rc, i) => (i ? ctx.lineTo(rc.cx, rc.cy) : ctx.moveTo(rc.cx, rc.cy)));
      ctx.stroke(); ctx.restore();
      pts.forEach((rc, i) => {
        ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(rc.cx, rc.cy, 9 * dpr, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `600 ${10 * dpr}px ${MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), rc.cx, rc.cy + 0.5 * dpr); ctx.textAlign = "left";
      });

      // moving reticle
      if (!REDUCED) {
        let cur = null;
        for (let k = 0; k < picks.length; k++) {
          const s = V0 + k * VISIT;
          const to = cellRect(picks[k], true);
          if (tt >= s && tt < s + VISIT) {
            const e = easeInOut(seg(tt, s, s + 320));
            cur = { x: lerp(prev.x, to.x, e), y: lerp(prev.y, to.y, e), w: lerp(prev.w, to.w, e), h: lerp(prev.h, to.h, e) };
          }
          prev = to;
        }
        if (cur) reticle(cur.x, cur.y, cur.w, cur.h);
      }

      const stage = REDUCED || tt > V0 + K * VISIT ? `${pixelFraction()}% of full-frame pixels`
        : tt < 450 ? "1 · context pass at scale 0.5"
        : tt < V0 ? "2 · score cells by uncertainty"
        : `3 · glimpse ${Math.min(K, Math.floor((tt - V0) / VISIT) + 1)} of ${K} at full resolution`;
      hud(MODES.glimpse.hud, stage);
    }

    function renderFull(tt) {
      ctx.drawImage(frame, 0, 0);
      drawGrid(0.12);
      hud(MODES.full.hud, "scale 1.0 · one pass");
    }

    function warpAmount(tt) {
      if (REDUCED) return 1;
      return easeInOut(seg(tt, 300, 1500)) * (1 - easeInOut(seg(tt, 5600, 6800)));
    }

    function renderWarp(tt) {
      const a = warpAmount(tt);
      const tx = tmp.getContext("2d");
      const step = Math.max(2, Math.round(2 * dpr));
      tx.clearRect(0, 0, W, H);
      for (let o = 0; o < W; o += step) {
        const s0 = lerp(o, warpX.inv[o], a), s1 = lerp(Math.min(W, o + step), warpX.inv[Math.min(W, o + step)], a);
        tx.drawImage(frame, s0, 0, Math.max(0.5, s1 - s0), H, o, 0, step, H);
      }
      for (let o = 0; o < H; o += step) {
        const s0 = lerp(o, warpY.inv[o], a), s1 = lerp(Math.min(H, o + step), warpY.inv[Math.min(H, o + step)], a);
        ctx.drawImage(tmp, 0, s0, W, Math.max(0.5, s1 - s0), 0, o, W, step);
      }
      // sampling lattice: where uniform source lines land after the warp
      ctx.save(); ctx.strokeStyle = theme.accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      const fwd = (w, n, x) => lerp(x, (w.cdf[Math.round(x)] / w.cdf[n]) * n, a);
      for (let c = 1; c < 16; c++) { const x = fwd(warpX, W, (c * W) / 16); ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let r = 1; r < 8; r++) { const y = fwd(warpY, H, (r * H) / 8); ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
      hud(MODES.warp.hud, "denser sampling where uncertainty is high");
    }

    function draw(now, dt) {
      if (!frame) return;
      const prevT = t;
      if (!REDUCED && hover == null) t += dt;
      if (t >= CYCLE) {
        t = 0;
        if (sources.length > 1) { idx++; prepare(); }
      }
      if (mode === "full") renderFull(t);
      else if (mode === "warp") renderWarp(t);
      else renderGlimpse(t);
      return prevT !== t;
    }

    function resize(w, h, d) { W = w; H = h; dpr = d; prepare(); }

    // controls
    function setMode(m) {
      mode = m; t = 0; hover = null;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
      if (note) note.textContent = MODES[m].note;
      runner.request();
    }
    buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    if (note) note.textContent = MODES[mode].note;

    cv.addEventListener("pointermove", (e) => {
      if (mode !== "glimpse" || !frame) return;
      const r = cv.getBoundingClientRect();
      const c = clamp(Math.floor(((e.clientX - r.left) / r.width) * GRID_C), 0, GRID_C - 1);
      const rr = clamp(Math.floor(((e.clientY - r.top) / r.height) * GRID_R), 0, GRID_R - 1);
      const i = rr * GRID_C + c;
      if (i !== hover) { hover = i; runner.request(); }
    });
    cv.addEventListener("pointerleave", () => { hover = null; runner.request(); });

  }

  /* ===================================================
     Figure: Heston Monte Carlo paths
     =================================================== */
  function hestonFigure(fig) {
    const cv = fig.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const N = 48, STEPS = 160, GROW = 3600, HOLD = 1800;
    let W, H, dpr, paths, vols, lo, hi, cycle = 0, t = 0;

    function gen() {
      const r = rng(97 + cycle * 13);
      const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(TAU * r());
      const kappa = 2.0, theta = 0.04, xi = 0.6, rho = -0.7, dt = 1 / STEPS;
      paths = []; vols = null; lo = Infinity; hi = -Infinity;
      for (let n = 0; n < N; n++) {
        const p = new Float32Array(STEPS + 1), vv = new Float32Array(STEPS + 1);
        let S = 1, v = 0.04; p[0] = 1; vv[0] = v;
        for (let i = 1; i <= STEPS; i++) {
          const z1 = gauss(), z2 = rho * z1 + Math.sqrt(1 - rho * rho) * gauss();
          const vp = Math.max(v, 0);
          S *= Math.exp(-0.5 * vp * dt + Math.sqrt(vp * dt) * z1);
          v = v + kappa * (theta - vp) * dt + xi * Math.sqrt(vp * dt) * z2;
          p[i] = S; vv[i] = Math.max(v, 0);
          lo = Math.min(lo, S); hi = Math.max(hi, S);
        }
        paths.push(p); if (n === 0) vols = vv;
      }
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    }
    gen();

    function draw(now, dt) {
      if (!REDUCED) t += dt;
      if (t > GROW + HOLD) { t = 0; cycle++; gen(); }
      const prog = REDUCED ? 1 : easeOut(seg(t, 0, GROW) * 1.0) ;
      const upto = Math.max(1, Math.floor(prog * STEPS));
      const m = 12 * dpr, histW = W * 0.18, volH = H * 0.16;
      const px0 = m, px1 = W - histW - m, py0 = m + 26 * dpr, py1 = H - volH - m * 2;
      const X = (i) => lerp(px0, px1, i / STEPS), Y = (s) => lerp(py1, py0, (s - lo) / (hi - lo));

      ctx.fillStyle = theme.bgAlt; ctx.fillRect(0, 0, W, H);
      // S0 reference
      ctx.strokeStyle = theme.muted; ctx.globalAlpha = 0.5; ctx.setLineDash([3 * dpr, 4 * dpr]); ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(px0, Y(1)); ctx.lineTo(px1, Y(1)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

      ctx.lineWidth = 1 * dpr; ctx.strokeStyle = theme.ink;
      for (let n = 1; n < N; n++) {
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        for (let i = 0; i <= upto; i++) (i ? ctx.lineTo(X(i), Y(paths[n][i])) : ctx.moveTo(X(i), Y(paths[n][i])));
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = theme.accent; ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let i = 0; i <= upto; i++) (i ? ctx.lineTo(X(i), Y(paths[0][i])) : ctx.moveTo(X(i), Y(paths[0][i])));
      ctx.stroke();
      ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(X(upto), Y(paths[0][upto]), 3.5 * dpr, 0, TAU); ctx.fill();

      // distribution of S_t at the current step
      const bins = 26, cnt = new Array(bins).fill(0);
      paths.forEach((p) => { cnt[clamp(Math.floor(((p[upto] - lo) / (hi - lo)) * bins), 0, bins - 1)]++; });
      const mx = Math.max(...cnt), bh = (py1 - py0) / bins, hx = W - histW;
      ctx.fillStyle = theme.ink; ctx.globalAlpha = 0.75;
      cnt.forEach((c, b) => { const w = (c / mx) * (histW - m * 1.5); ctx.fillRect(hx, Y(lo + ((b + 1) / bins) * (hi - lo)), w, bh - 1 * dpr); });
      ctx.globalAlpha = 1;

      // variance path of the highlighted trajectory
      let vmax = 0; vols.forEach((v) => (vmax = Math.max(vmax, v)));
      const vy1 = H - m, vy0 = vy1 - volH;
      ctx.fillStyle = theme.accent; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.moveTo(X(0), vy1);
      for (let i = 0; i <= upto; i++) ctx.lineTo(X(i), lerp(vy1, vy0, vols[i] / vmax));
      ctx.lineTo(X(upto), vy1); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = `500 ${10 * dpr}px ${MONO}`; ctx.fillStyle = theme.muted; ctx.textBaseline = "alphabetic";
      ctx.fillText("variance v(t)", X(0) + 4 * dpr, vy0 + 10 * dpr);
      ctx.fillText(`S(t) distribution`, hx, py0 - 6 * dpr);

      label(ctx, `Heston · ${N} paths · κ=2 θ=0.04 ξ=0.6 ρ=−0.7`, m - 6 * dpr, m - 6 * dpr, dpr, { bgAlpha: 0, weight: 600 });
      return true;
    }

    mount(cv, { resize: (w, h, d) => { W = w; H = h; dpr = d; }, draw });
  }

  /* ===================================================
     Figure: ST-GCN hand skeleton
     =================================================== */
  const EDGES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
  const FINGERS = [
    { b: [-0.36, -0.26], a: -0.95, L: [0.3, 0.26, 0.22] },
    { b: [-0.3, -0.92], a: -0.14, L: [0.42, 0.26, 0.2] },
    { b: [-0.08, -1.0], a: 0, L: [0.47, 0.29, 0.21] },
    { b: [0.14, -0.95], a: 0.1, L: [0.43, 0.27, 0.2] },
    { b: [0.33, -0.82], a: 0.22, L: [0.33, 0.21, 0.18] },
  ];
  const HOPS = (() => {
    const d = new Array(21).fill(99); d[0] = 0;
    for (let k = 0; k < 21; k++) EDGES.forEach(([a, b]) => { d[b] = Math.min(d[b], d[a] + 1); d[a] = Math.min(d[a], d[b] + 1); });
    return d;
  })();
  const POSES = [[5, 2], [3, 0], [5, 4], [1, 1], [2, 4]];
  const extended = (n) => [n === 5, n >= 1, n >= 2, n >= 3, n >= 4];

  function handJoints(curls, wob) {
    const J = [[0, 0]];
    FINGERS.forEach((f, fi) => {
      const c = curls[fi];
      let [x, y] = f.b; J.push([x, y]);
      let ang = f.a + wob * (fi - 2) * 0.03;
      const bend = fi === 0 ? [0.7, 1.3, 1.6] : [0.25, 2.3, 3.0];
      for (let s = 0; s < 3; s++) {
        const a = ang + c * bend[s];
        const len = f.L[s] * (1 - (s === 0 ? 0.35 : 0.55) * c);
        x += Math.sin(a) * len; y -= Math.cos(a) * len;
        J.push([x, y]);
      }
    });
    return J;
  }

  function gestureFigure(fig) {
    const cv = fig.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const POSE_MS = 2600;
    let W, H, dpr, t = 0, hist = [], lastPush = -1e9;
    const curls = [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1]];

    function draw(now, dt) {
      if (!REDUCED) t += dt;
      const pi = Math.floor(t / POSE_MS) % POSES.length;
      const pose = POSES[pi];
      const k = REDUCED ? 1 : 1 - Math.exp(-dt / 110);
      for (let h = 0; h < 2; h++) {
        const ex = extended(pose[h]);
        for (let f = 0; f < 5; f++) curls[h][f] = lerp(curls[h][f], ex[f] ? 0 : 1, k);
      }
      const sc = Math.min(W * 0.2, H * 0.4);
      const centers = [[W * 0.29, H * 0.86], [W * 0.71, H * 0.86]];
      const hands = [0, 1].map((h) => {
        const wob = Math.sin(t / 700 + h * 1.7);
        const J = handJoints(curls[h], wob);
        const [cx, cy] = centers[h];
        const rot = (h ? 1 : -1) * 0.12 + wob * 0.03;
        return J.map(([x, y]) => {
          const xx = (h ? x : -x), xr = xx * Math.cos(rot) - y * Math.sin(rot), yr = xx * Math.sin(rot) + y * Math.cos(rot);
          return [cx + xr * sc, cy + yr * sc + Math.sin(t / 900 + h) * 3 * dpr];
        });
      });
      if (t - lastPush > 160) { hist.push(hands); if (hist.length > 4) hist.shift(); lastPush = t; }

      ctx.fillStyle = theme.bgAlt; ctx.fillRect(0, 0, W, H);

      // temporal edges: same joint across past frames (the "T" in ST-GCN)
      ctx.strokeStyle = theme.muted; ctx.lineWidth = 1 * dpr; ctx.setLineDash([2 * dpr, 3 * dpr]);
      [4, 8, 12, 16, 20].forEach((j) => {
        for (let h = 0; h < 2; h++) {
          ctx.globalAlpha = 0.5; ctx.beginPath();
          hist.forEach((fr, i) => (i ? ctx.lineTo(fr[h][j][0], fr[h][j][1]) : ctx.moveTo(fr[h][j][0], fr[h][j][1])));
          ctx.lineTo(hands[h][j][0], hands[h][j][1]); ctx.stroke();
        }
      });
      ctx.setLineDash([]);
      hist.forEach((fr, i) => {
        ctx.globalAlpha = 0.07 + i * 0.03; ctx.strokeStyle = theme.ink;
        fr.forEach((J) => { ctx.beginPath(); EDGES.forEach(([a, b]) => { ctx.moveTo(J[a][0], J[a][1]); ctx.lineTo(J[b][0], J[b][1]); }); ctx.stroke(); });
      });
      ctx.globalAlpha = 1;

      // message passing pulse from the wrist outward
      const phase = REDUCED ? 2 : ((t / 180) % 8) - 1.5;
      const pulse = (j) => Math.exp(-Math.pow(HOPS[j] - phase, 2) / 0.6);
      hands.forEach((J) => {
        EDGES.forEach(([a, b]) => {
          const p = (pulse(a) + pulse(b)) / 2;
          ctx.lineWidth = (1.5 + 1.5 * p) * dpr;
          ctx.strokeStyle = theme.ink; ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.moveTo(J[a][0], J[a][1]); ctx.lineTo(J[b][0], J[b][1]); ctx.stroke();
          if (p > 0.05) { ctx.strokeStyle = theme.accent; ctx.globalAlpha = p; ctx.stroke(); }
        });
        ctx.globalAlpha = 1;
        J.forEach(([x, y], j) => {
          const p = pulse(j);
          ctx.fillStyle = theme.bgAlt; ctx.beginPath(); ctx.arc(x, y, (3 + 2 * p) * dpr, 0, TAU); ctx.fill();
          ctx.fillStyle = p > 0.3 ? theme.accent : theme.ink; ctx.beginPath(); ctx.arc(x, y, (2 + 2 * p) * dpr, 0, TAU); ctx.fill();
        });
      });

      const m = 10 * dpr;
      label(ctx, "21 keypoints × 2 hands · 4-frame window", m - 6 * dpr, m - 6 * dpr, dpr, { bgAlpha: 0, weight: 600 });
      label(ctx, "solid: spatial · dotted: temporal", W - m, H - m - 20 * dpr, dpr, { align: "right", bg: theme.bg, color: theme.muted });
      return true;
    }

    mount(cv, { resize: (w, h, d) => { W = w; H = h; dpr = d; hist = []; }, draw });
  }

  /* ===================================================
     Runner: sizing, visibility, reduced motion, theme
     =================================================== */
  const runners = [];
  function mount(cv, inst) {
    let raf = 0, last = 0, visible = false, sized = false;
    const ctx = cv.getContext("2d");
    const running = () => visible && !REDUCED && !document.hidden;

    function frame(ts) {
      raf = 0;
      const dt = last ? Math.min(ts - last, 64) : 16;
      last = ts;
      if (sized) inst.draw(ts, dt);
      if (running()) raf = requestAnimationFrame(frame); else last = 0;
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }

    const ro = new ResizeObserver(() => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
      if (!w || !h) return;
      if (w === cv.width && h === cv.height && sized) return;
      cv.width = w; cv.height = h; ctx.setTransform(1, 0, 0, 1, 0, 0);
      inst.resize(w, h, d); sized = true; request();
    });
    ro.observe(cv);

    new IntersectionObserver((es) => {
      es.forEach((e) => { visible = e.isIntersecting; if (visible) request(); });
    }, { rootMargin: "100px" }).observe(cv);

    const r = { request };
    runners.push(r);
    return r;
  }

  document.addEventListener("visibilitychange", () => runners.forEach((r) => r.request()));
  new MutationObserver(() => { readTheme(); runners.forEach((r) => r.request()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const KINDS = { glimpse: glimpseFigure, heston: hestonFigure, gesture: gestureFigure };
  document.querySelectorAll("[data-figure]").forEach((fig) => {
    const k = KINDS[fig.dataset.figure];
    if (k) k(fig);
  });
})();
