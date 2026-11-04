// "See it run": replays a real session (outputs copied from a localnet run), typed when it scrolls into view.
const LINES = [
  ["$ ", "allot init"], ["", '{ "address": "Hba6…J9C", "sol": 0, "usdc": 5, "allotment": { "perTxUsd": 25, "dailyUsd": 100 } }'],
  ["$ ", "allot pay http://localhost:4340/x402/price?token=BONK"], ["", '{ "paid": true, "usd": 0.1, "asset": "USDC", "feePaidBy": "seller", "registrySeq": 1 }'],
  ["$ ", "allot buy BONK 0.02"], ["", '{ "youPay": "0.02 SOL", "youGet": "621890 $Bonk", "route": ["Whirlpool","GoonFi V2"], "done": true }'],
  ["$ ", "allot buy JUP 5"], ["!", "allot: $476.11 is over the per-action cap of $25. Nothing was done."],
  ["$ ", "allot revoke --sweep"], ["", '{ "revoked": true, "swept": "4xQ…9Lm" }'],
  ["$ ", "allot buy BONK 0.01"], ["!", "allot: This allotment was revoked by its owner. Nothing was done."],
];
const out = document.querySelector("#termOut");
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
let started = false;
async function play() {
  if (started) return; started = true;
  const fast = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let html = "";
  for (const [p, text] of LINES) {
    const cls = p === "$ " ? "c" : p === "!" ? "e" : "o";
    if (cls === "c" && !fast) {
      for (let i = 1; i <= text.length; i++) { out.innerHTML = html + `<span class="c"><b>$</b> ${esc(text.slice(0, i))}</span><i class="cur"></i>`; await new Promise((r) => setTimeout(r, 28)); }
      await new Promise((r) => setTimeout(r, 250));
    }
    html += cls === "c" ? `<span class="c"><b>$</b> ${esc(text)}</span>\n` : `<span class="${cls}">${esc(text)}</span>\n`;
    out.innerHTML = html + `<i class="cur"></i>`;
    if (!fast) await new Promise((r) => setTimeout(r, cls === "c" ? 120 : 500));
  }
}
new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && play(), { threshold: 0.3 }).observe(out);
