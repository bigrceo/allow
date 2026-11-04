// Static build for hosting without a server (Vercel): the site plus a frozen snapshot of the demo
// agent's registry, so the dashboard, live panels and /verify work. Owner actions, x402 seller and remote
// MCP need `allow serve` and are not part of this build. Usage: ALLOW_HOME=... node scripts/build-static.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const BASE = process.env.BASE || "http://localhost:4341", OUT = "dist";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/api/proof`, { recursive: true });
cpSync("web", OUT, { recursive: true });
for (const [from, to] of [["index.html", "index.html"], ["dashboard.html", "dashboard/index.html"], ["verify.html", "verify/index.html"], ["docs.html", "docs/index.html"]]) {
  mkdirSync(`${OUT}/${to}`.replace(/\/[^/]+$/, ""), { recursive: true }); cpSync(`web/${from}`, `${OUT}/${to}`);
}
mkdirSync(`${OUT}/lib`, { recursive: true }); cpSync("lib/merkle.mjs", `${OUT}/lib/merkle.mjs`); cpSync("brand.mjs", `${OUT}/brand.mjs`);
mkdirSync(`${OUT}/vendor`, { recursive: true }); cpSync("node_modules/tweetnacl/nacl-fast.min.js", `${OUT}/vendor/nacl.js`);
if (!existsSync("web/downloads")) execSync("npm run pack", { stdio: "inherit" });
const get = async (p) => (await fetch(BASE + p)).text();
const state = JSON.parse(await get("/api/state"));
state.snapshot = new Date().toISOString();
writeFileSync(`${OUT}/api/state`, JSON.stringify(state));
writeFileSync(`${OUT}/api/registry`, await get("/api/registry"));
for (const e of JSON.parse(await get("/api/registry")).entries) writeFileSync(`${OUT}/api/proof/${e.seq}`, await get(`/api/proof/${e.seq}`));
writeFileSync(`${OUT}/vercel.json`, JSON.stringify({
  cleanUrls: true,
  headers: [{ source: "/api/(.*)", headers: [{ key: "content-type", value: "application/json" }, { key: "cache-control", value: "no-store" }] }],
}, null, 2));
console.log(`dist ready, ${state.entries?.length ?? 0} registry entries`);
