// Hero background: vertical light bars that sway and breathe. Bright core, warm falloff. Canvas, no deps.
const c = document.querySelector("#bars");
const ctx = c.getContext("2d");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
let w, h, dpr, bars;
function size() {
  dpr = Math.min(2, devicePixelRatio || 1);
  w = c.clientWidth; h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr;
  const n = Math.ceil(w / 14);
  bars = Array.from({ length: n }, (_, i) => ({ x: i / n, ph: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.5, wd: 6 + Math.random() * 10 }));
}
// Brightness across the width: a hot band left of center, a second softer one right.
const field = (x, t) => Math.exp(-((x - 0.55 - 0.05 * Math.sin(t * 0.21)) ** 2) / 0.016) + 0.7 * Math.exp(-((x - 0.92 - 0.04 * Math.cos(t * 0.17)) ** 2) / 0.01);
function frame(ms) {
  const t = ms / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  for (const b of bars) {
    const f = field(b.x, t) * (0.65 + 0.35 * Math.sin(t * b.sp + b.ph));
    if (f < 0.02) continue;
    const x = b.x * w + Math.sin(t * 0.4 + b.ph) * 3;
    const top = h * (0.08 + 0.25 * (1 - f)), bottom = h * 0.98;
    const hot = Math.min(1, f * 1.25);
    // Bloom: a wide soft column first, then the bar itself with a white-hot middle.
    const bloom = ctx.createLinearGradient(0, top, 0, bottom);
    bloom.addColorStop(0, "rgba(255,90,31,0)");
    bloom.addColorStop(0.55, `rgba(255,110,40,${0.22 * hot})`);
    bloom.addColorStop(1, "rgba(255,70,20,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(x - b.wd * 1.6, top, b.wd * 3.2, bottom - top);
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, "rgba(255,120,40,0)");
    g.addColorStop(0.3, `rgba(255,${150 + 90 * hot},${90 + 140 * hot},${0.75 * hot})`);
    g.addColorStop(0.55, `rgba(255,${200 + 55 * hot},${170 + 80 * hot},${0.95 * hot})`);
    g.addColorStop(0.8, `rgba(255,${110 + 50 * hot},40,${0.8 * hot})`);
    g.addColorStop(1, "rgba(255,70,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - b.wd / 2, top, b.wd, bottom - top);
  }
  ctx.globalCompositeOperation = "source-over";
  if (!still) requestAnimationFrame(frame);
}
size(); addEventListener("resize", size);
requestAnimationFrame(frame);
