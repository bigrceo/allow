// Brand comes from /brand.mjs only. Every page fills its placeholders from it.
import { BRAND, installCmd, logoSvg } from "/brand.mjs";
document.documentElement.style.setProperty("--accent", BRAND.color);
for (const el of document.querySelectorAll("[data-b]")) el.textContent = BRAND[el.dataset.b];
for (const el of document.querySelectorAll("[data-logo]")) el.innerHTML = logoSvg(el.dataset.logo || BRAND.color);
for (const el of document.querySelectorAll("[data-install]")) { const c = installCmd(el.dataset.install || "init"); el.textContent = c; el.nextElementSibling?.setAttribute?.("data-copy", c); }
for (const el of document.querySelectorAll("a[data-x]")) el.href = `https://x.com/${BRAND.x}`;
document.title = document.title.replace("{name}", BRAND.name).replace("{tagline}", BRAND.tagline);
export const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "");
const page = location.pathname;
const ICON = {wallet:`<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14v4m0 4v4H5a2 2 0 0 1-2-2V5"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/>`,gauge:`<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>`,send:`<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/>`,swap:`<path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/>`,list:`<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,shield:`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>`,book:`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>`,term:`<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>`,chat:`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>`};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
// Mega menus: a list of rows on the left, two picture cards on the right. Pictures zoom on hover.
const MENUS = {
  product: {
    rows: [
      ["wallet", "The wallet", "A Solana keypair on your machine, used through MCP.", "/docs"],
      ["gauge", "The allowance", "Caps per action, per day and in total.", "/dashboard"],
      ["send", "x402 payments", "USDC with the fee paid by the seller, or SOL.", "/docs"],
      ["swap", "Trading", "Any Solana token through Jupiter, floor re-checked.", "/docs"],
      ["list", "Registry", "Every action signed, chained and anchored.", "/dashboard"],
    ],
    cards: [["/visuals/registry.svg", "Dashboard", "Balance, caps and every action of the agent.", "/dashboard"], ["/visuals/verify.svg", "Verify", "Recompute an entry and read its memo on Solana.", "/verify"]],
  },
  docs: {
    rows: [
      ["book", "Install", "Wallet, allowance and funding in two minutes.", "/docs"],
      ["chat", "Claude and ChatGPT", "MCP for Claude Desktop, Claude Code and ChatGPT.", "/docs"],
      ["term", "CLI", "status, pay, buy, sell, history, revoke.", "/docs"],
      ["shield", "Security model", "What is enforced, and where.", "/docs"],
    ],
    cards: [["/visuals/caps.svg", "Allowance", "Caps the model can read and never raise.", "/dashboard"], ["/visuals/x402.svg", "x402 in USDC", "Pay APIs with a wallet that holds no SOL.", "/docs"]],
  },
};
const mega = (k) => `<div class="mega" data-menu="${k}"><div class="mega-in"><div class="mrows">${MENUS[k].rows.map(([i, t, d, h]) => `<a class="mrow" href="${h}"><span class="mico">${icon(i)}</span><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</div><div class="mcards">${MENUS[k].cards.map(([img, t, d, h]) => `<a class="mcard" href="${h}"><span class="mimg"><img src="${img}" alt=""></span><span class="mtxt"><b>${t}</b><small>${d}</small><i>↗</i></span></a>`).join("")}</div></div></div>`;
const chev = `<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m3 4.5 3 3 3-3"/></svg>`;
document.querySelector("nav .wrap").innerHTML = `<div class="bar">
  <a class="brand" href="/"><span data-logo>${logoSvg()}</span>${BRAND.name}</a>
  <div class="links">
    <a href="/" class="${page === "/" ? "on" : ""}">Home</a>
    <button type="button" data-open="product">Product${chev}</button>
    <button type="button" data-open="docs">Docs${chev}</button>
    <a href="/dashboard" class="${page === "/dashboard" ? "on" : ""}">Dashboard</a>
    <a href="/verify" class="${page === "/verify" ? "on" : ""}">Verify</a>
    <a href="${BRAND.repo}">GitHub</a>
  </div>
  <div class="navr">
    <button class="ca" data-copy-ca title="Contract address">$${BRAND.ticker} <span>${BRAND.ca ? short(BRAND.ca) : "CA at launch"}</span></button>
    <a class="xb" href="https://x.com/${BRAND.x}" aria-label="X"><i class="li" style="--m:url(/logos/x.svg);width:16px;height:16px"></i></a>
    <a class="btn" href="/docs" style="padding:9px 16px;font-size:14px">Install</a>
    <button class="mbtn" type="button" aria-label="Menu"><i></i><i></i></button>
  </div></div>${mega("product")}${mega("docs")}
  <div class="mlist"><div>${[["Home", "/"], ...MENUS.product.rows.map((r) => [r[1], r[3]]), ["Docs", "/docs"], ["Dashboard", "/dashboard"], ["Verify", "/verify"]].map(([t, h]) => `<a href="${h}">${t}<span>↗</span></a>`).join("")}</div></div>`;
document.querySelector(".mbtn")?.addEventListener("click", () => document.querySelector("nav#nav").classList.toggle("mopen"));
{
  const navEl = document.querySelector("nav#nav");
  let shut;
  const open = (k) => { clearTimeout(shut); navEl.classList.toggle("open", !!k); navEl.querySelectorAll(".mega").forEach((m) => m.classList.toggle("show", m.dataset.menu === k)); navEl.querySelectorAll("[data-open]").forEach((b) => b.classList.toggle("on", b.dataset.open === k)); };
  navEl?.querySelectorAll("[data-open]").forEach((b) => {
    b.addEventListener("mouseenter", () => matchMedia("(hover: hover)").matches && open(b.dataset.open));
    b.addEventListener("click", () => { if (innerWidth < 1024) return void (location.href = MENUS[b.dataset.open].rows[0][3]); open(matchMedia("(hover: hover)").matches || !b.classList.contains("on") ? b.dataset.open : null); });
  });
  navEl?.querySelectorAll(".links > a").forEach((a) => a.addEventListener("mouseenter", () => open(null)));
  navEl?.addEventListener("mouseleave", () => (shut = setTimeout(() => open(null), 180)));
  addEventListener("keydown", (e) => e.key === "Escape" && open(null));
}
const caBtn = document.querySelector("[data-copy-ca]");
if (caBtn) caBtn.onclick = () => BRAND.ca && navigator.clipboard?.writeText(BRAND.ca);
for (const b of document.querySelectorAll("[data-copy]")) b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1400); };
export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export { BRAND };
if (BRAND.ca && document.querySelector("#ca")) document.querySelector("#ca").textContent = BRAND.ca;

// Nav turns to glass once the page leaves the top.
const nav = document.querySelector("nav#nav");
if (nav) { const on = () => nav.classList.toggle("glass", scrollY > 12); on(); addEventListener("scroll", on, { passive: true }); }

// Hero rises on load; everything else reveals as it scrolls in, staggered inside each block.
document.querySelectorAll(".hero-grid > div:first-child > *, .hero .panels").forEach((el, i) => { el.classList.add("rise"); el.style.animationDelay = `${i * 90}ms`; });
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll("section .wrap > *, .tcards > *, .rules > *, .links3 > *").forEach((el) => {
  if (el.closest(".hero") || el.classList.contains("stack")) return;
  const sib = [...el.parentElement.children].indexOf(el);
  el.classList.add("rv"); el.style.setProperty("--d", `${Math.min(sib, 5) * 90}ms`); io.observe(el);
});

// Big digits scale to their length so they always fit the card (cqw = card width).
export function fitDigits(el) { el.style.fontSize = `min(${(150 / Math.max(2, el.textContent.length)).toFixed(2)}cqw, var(--cap))`; }

// Over a light section the nav switches to its day look.
const lights = document.querySelectorAll(".frame-l");
if (nav && lights.length) {
  const day = () => { const y = 40; nav.classList.toggle("day", [...lights].some((l) => { const r = l.getBoundingClientRect(); return r.top < y && r.bottom > y; })); };
  day(); addEventListener("scroll", day, { passive: true });
}
for (const a of document.querySelectorAll("a[data-repo]")) a.href = BRAND.repo;
for (const a of document.querySelectorAll("a[data-repo-claims]")) a.href = `${BRAND.repo}/blob/main/CLAIMS.md`;
