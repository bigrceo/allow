// Allot local server on :4340: site, dashboard, /verify, public registry API, demo x402 endpoints, remote MCP.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { BRAND } from "./brand.mjs";
import { CLUSTER, LIVE_TRADING, PORT, RPC_URL } from "./lib/config.mjs";
import * as core from "./lib/core.mjs";
import { priceUsd, resolveToken } from "./lib/jupiter.mjs";
import { anchors, entries, proofFor, record } from "./lib/registry.mjs";
import { readJson, writeJson } from "./lib/store.mjs";
import { getPolicy, loadAgent, setPolicy } from "./lib/wallet.mjs";
import { NETWORK, requirement, settle } from "./lib/x402.mjs";
import { registerTools } from "./mcp/tools.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".md": "text/markdown; charset=utf-8" };
const PAGES = { "/": "index.html", "/dashboard": "dashboard.html", "/verify": "verify.html", "/docs": "docs.html" };
// Browser code shared with Node: served straight from lib/ and node_modules so /verify runs the exact same checks.
const SHARED = { "/lib/merkle.mjs": "lib/merkle.mjs", "/brand.mjs": "brand.mjs", "/vendor/nacl.js": "node_modules/tweetnacl/nacl-fast.min.js", "/vendor/bs58.js": "web/vendor/bs58.js" };

const json = (res, code, o, h = {}) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", ...h }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((ok) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch { ok({}); } }); });
const isLocal = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress) && !req.headers["x-forwarded-for"];

// The demo seller: a separate key that sells two small x402 endpoints, so the agent has something real to pay.
function seller() {
  let s = readJson("seller.json");
  if (!s) { const kp = Keypair.generate(); s = { address: kp.publicKey.toBase58(), secretKey: bs58.encode(kp.secretKey) }; writeJson("seller.json", s); }
  return s;
}
const PAID = {
  "/x402/price": { lamports: 1_000_000, description: "Live price, liquidity and safety flags of any Solana token" },
  "/x402/sol": { lamports: 500_000, description: "SOL/USD spot from Jupiter" },
};

async function paidEndpoint(req, res, url) {
  const spec = PAID[url.pathname];
  const reqm = requirement({ resource: url.origin + url.pathname, description: spec.description, lamports: spec.lamports, payTo: seller().address });
  const header = req.headers["x-payment"];
  if (!header) return json(res, 402, { x402Version: 1, error: "X-PAYMENT header is required", accepts: [reqm] });
  let settled;
  try { settled = await settle(header, reqm); } catch (e) { return json(res, 402, { x402Version: 1, error: e.message, accepts: [reqm] }); }
  let out;
  if (url.pathname === "/x402/sol") out = { solUsd: await priceUsd("So11111111111111111111111111111111111111112") };
  else {
    const r = await resolveToken(url.searchParams.get("token") || "SOL");
    out = r.kind === "found" ? r.token : r;
  }
  json(res, 200, { ...out, paidWith: settled.sig }, { "x-payment-response": settled.header, "access-control-expose-headers": "x-payment-response" });
}

async function mcpHttp(req, res) {
  const server = new McpServer({ name: "allot", version: "0.1.0" });
  registerTools(server);
  const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { t.close(); server.close(); });
  await server.connect(t);
  await t.handleRequest(req, res, req.method === "POST" ? await body(req) : undefined);
}

async function state() {
  const agent = loadAgent();
  if (!agent) return { ready: false, brand: BRAND, cluster: CLUSTER };
  return { ready: true, brand: BRAND, cluster: CLUSTER, rpc: RPC_URL, network: NETWORK, live: LIVE_TRADING, wallet: await core.wallet(), budget: await core.budget(), entries: entries().slice(-50).reverse(), anchors: anchors().slice().reverse(), seller: seller().address };
}

const srv = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname in PAID) return await paidEndpoint(req, res, url);
    if (url.pathname.startsWith("/mcp/")) {
      if (url.pathname.slice(5) !== readJson("server.json")?.mcpKey) return json(res, 404, { error: "not found" });
      return await mcpHttp(req, res);
    }
    if (url.pathname === "/api/state") return json(res, 200, await state());
    if (url.pathname === "/api/registry") return json(res, 200, { entries: entries(), anchors: anchors() });
    if (url.pathname.startsWith("/api/proof/")) { const p = await proofFor(url.pathname.split("/").pop()); return p ? json(res, 200, p) : json(res, 404, { error: "no such entry" }); }
    if (url.pathname.startsWith("/api/owner/")) {
      // Owner controls: this machine only, never through a tunnel. The agent has no tool for these.
      if (!isLocal(req) || req.method !== "POST" || req.headers["sec-fetch-site"] === "cross-site") return json(res, 403, { error: "owner actions are local only" });
      const agent = loadAgent();
      if (!agent) return json(res, 400, { error: "no wallet" });
      const b = await body(req);
      if (url.pathname === "/api/owner/policy") { const p = setPolicy(b); await record(agent, "policy.set", p); return json(res, 200, p); }
      if (url.pathname === "/api/owner/revoke") { setPolicy({ revoked: !!b.revoked }); await record(agent, b.revoked ? "revoke" : "unrevoke", {}); return json(res, 200, getPolicy()); }
      return json(res, 404, { error: "not found" });
    }
    const f = PAGES[url.pathname] ? join("web", PAGES[url.pathname]) : SHARED[url.pathname] ?? join("web", url.pathname.replace(/\.\.+/g, ""));
    const path = join(root, f);
    if (!existsSync(path) || !path.startsWith(root)) return json(res, 404, { error: "not found" });
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(readFileSync(path));
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});
// Off mainnet, give the demo seller rent so the first small payment can land.
if (CLUSTER !== "mainnet") import("./lib/wallet.mjs").then(async (w) => { if (!(await w.solBalance(seller().address).catch(() => 1))) await w.airdrop(seller().address, 0.01).catch(() => null); });
srv.listen(PORT, () => console.log(`${BRAND.name} on http://localhost:${PORT} · cluster ${CLUSTER} · trading ${LIVE_TRADING ? "LIVE" : "simulated"}`));
