// Real screens of Allow for the video, taken from the running site (localhost:4341) with Chrome.
import { chromium } from "/Users/rayane/hush/node_modules/playwright-core/index.mjs";
const BASE = process.env.BASE || "http://localhost:4341";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const settle = async () => page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 1200));
  document.querySelectorAll(".rv").forEach((e) => { e.style.transition = "none"; e.classList.add("in"); });
  document.getAnimations().forEach((a) => { try { a.finish(); } catch {} });
});
const shot = async (path, name, prep) => { await page.goto(BASE + path); await settle(); if (prep) await page.evaluate(prep); await page.waitForTimeout(400); await page.screenshot({ path: `screens/${name}.png` }); };
await shot("/", "hero");
await shot("/", "cards", () => scrollTo(0, document.querySelector(".tcards").getBoundingClientRect().top + scrollY - 160));
await shot("/", "rules", () => scrollTo(0, document.querySelector(".rules").getBoundingClientRect().top + scrollY - 260));
await shot("/", "agent", () => scrollTo(0, document.querySelector(".frame-l").getBoundingClientRect().top + scrollY - 20));
await shot("/dashboard", "dashboard");
await shot("/verify?seq=5", "verify", () => new Promise((r) => setTimeout(r, 2500)));
await page.goto(BASE + "/"); await settle();
await page.evaluate(() => { const t = document.querySelector("#term"); t.scrollIntoView({ block: "center" }); });
await page.waitForTimeout(9000); // let the terminal finish typing the real session
await (await page.$("#term")).screenshot({ path: "screens/terminal.png" });
await browser.close();
