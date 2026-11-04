// Inner pages: columns of small squares down both edges that twinkle in the brand colors, plus a top glow.
if (!document.querySelector(".frame")) {
  const c = Object.assign(document.createElement("canvas"), { id: "pix", ariaHidden: "true" });
  document.body.prepend(c);
  const glow = Object.assign(document.createElement("div"), { className: "topglow" });
  document.body.prepend(glow);
  const ctx = c.getContext("2d"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = 7, G = 3, COLS = 9, COLORS = ["255,90,31", "255,160,90", "255,214,170", "200,60,10"];
  let cells = [], w, h, dpr;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    cells = [];
    const show = w >= 900;
    if (!show) return;
    for (let side = 0; side < 2; side++) for (let i = 0; i < COLS; i++) for (let y = 0; y < h; y += S + G) {
      const edge = 1 - i / COLS; // denser near the edge
      if (Math.random() > 0.18 + 0.5 * edge) continue;
      const x = side ? w - (i + 1) * (S + G) - 4 : 4 + i * (S + G);
      cells.push({ x, y, c: COLORS[(Math.random() * 4) | 0], a: Math.random() * 0.5 * edge + 0.05, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.6 });
    }
  };
  const frame = (ms) => {
    const t = ms / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    for (const p of cells) { ctx.fillStyle = `rgba(${p.c},${(p.a * (0.55 + 0.45 * Math.sin(t * p.sp + p.ph))).toFixed(3)})`; ctx.fillRect(p.x, p.y, S, S); }
    if (!still) requestAnimationFrame(frame);
  };
  size(); addEventListener("resize", size); requestAnimationFrame(frame);
}
