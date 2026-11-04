// Brand comes from /brand.mjs only. Every page fills its placeholders from it.
import { BRAND, logoSvg } from "/brand.mjs";
document.documentElement.style.setProperty("--accent", BRAND.color);
for (const el of document.querySelectorAll("[data-b]")) el.textContent = BRAND[el.dataset.b];
for (const el of document.querySelectorAll("[data-logo]")) el.innerHTML = logoSvg(el.dataset.logo || BRAND.color);
for (const el of document.querySelectorAll("a[data-x]")) el.href = `https://x.com/${BRAND.x}`;
document.title = document.title.replace("{name}", BRAND.name).replace("{tagline}", BRAND.tagline);
export const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "");
const page = location.pathname;
document.querySelector("nav .wrap").innerHTML = `
  <a class="brand" href="/"><span data-logo>${logoSvg()}</span>${BRAND.name}</a>
  <div class="links">
    <a href="/docs" class="${page === "/docs" ? "on" : ""}">Docs</a>
    <a href="/dashboard" class="${page === "/dashboard" ? "on" : ""}">Dashboard</a>
    <a href="/verify" class="hide-m ${page === "/verify" ? "on" : ""}">Verify</a>
  </div>
  <div class="navr">
    <button class="ca" data-copy-ca title="Contract address">$${BRAND.ticker} <span>${BRAND.ca ? short(BRAND.ca) : "CA at launch"}</span></button>
    <a class="xb" href="https://x.com/${BRAND.x}" aria-label="X"><i class="li" style="--m:url(/logos/x.svg);width:16px;height:16px"></i></a>
    <a class="btn" href="/docs" style="padding:9px 16px;font-size:14px">Install</a>
  </div>`;
const caBtn = document.querySelector("[data-copy-ca]");
if (caBtn) caBtn.onclick = () => BRAND.ca && navigator.clipboard?.writeText(BRAND.ca);
for (const b of document.querySelectorAll("[data-copy]")) b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1400); };
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export { BRAND };
if (BRAND.ca && document.querySelector("#ca")) document.querySelector("#ca").textContent = BRAND.ca;
