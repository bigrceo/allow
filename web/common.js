// Brand comes from /brand.mjs only. Every page fills its placeholders from it.
import { BRAND, logoSvg } from "/brand.mjs";
document.documentElement.style.setProperty("--accent", BRAND.color);
for (const el of document.querySelectorAll("[data-b]")) el.textContent = BRAND[el.dataset.b];
for (const el of document.querySelectorAll("[data-logo]")) el.innerHTML = logoSvg(el.dataset.logo || BRAND.color);
for (const el of document.querySelectorAll("a[data-x]")) el.href = `https://x.com/${BRAND.x}`;
document.title = document.title.replace("{name}", BRAND.name).replace("{tagline}", BRAND.tagline);
const page = location.pathname;
document.querySelector("nav .wrap").innerHTML = `
  <a class="brand" href="/"><span data-logo>${logoSvg()}</span>${BRAND.name}</a>
  <div class="links">
    <a href="/docs" class="${page === "/docs" ? "on" : ""}">Docs</a>
    <a href="/dashboard" class="${page === "/dashboard" ? "on" : ""}">Dashboard</a>
    <a href="/verify" class="hide-m ${page === "/verify" ? "on" : ""}">Verify</a>
    <a href="https://x.com/${BRAND.x}" class="hide-m">X</a>
  </div>`;
for (const b of document.querySelectorAll("[data-copy]")) b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1400); };
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "");
export { BRAND };
