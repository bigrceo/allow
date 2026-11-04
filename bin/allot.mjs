#!/usr/bin/env node
// allot: the owner's side of the kit. Create the wallet, set the allotment, watch it, revoke it.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { BRAND } from "../brand.mjs";
import { CLUSTER, HOME, LIVE_TRADING, SITE_URL } from "../lib/config.mjs";
import * as core from "../lib/core.mjs";
import { anchor, record } from "../lib/registry.mjs";
import { readJson, writeJson } from "../lib/store.mjs";
import { airdrop, createAgent, getPolicy, loadAgent, setPolicy, sweep } from "../lib/wallet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...args] = process.argv.slice(2);
const flag = (f) => args.includes(f);
const show = (o) => console.log(typeof o === "string" ? o : JSON.stringify(o, null, 2));
const need = () => { const a = loadAgent(); if (!a) throw new Error("No wallet yet: run `allot init`."); return a; };

const HELP = `${BRAND.name}. ${BRAND.tagline}

  allot init                  create the agent wallet and its allotment (${HOME})
  allot status                address, balance, allotment left
  allot airdrop [sol]         devnet SOL to test with
  allot policy                show the allotment
  allot policy <field> <v>    perTxUsd | dailyUsd | totalUsd | maxSlippageBps | payHosts | tokens | owner | expiresAt
  allot pay <url>             pay an x402 endpoint
  allot buy <token> <sol>     quote then swap (simulated unless mainnet + ALLOT_LIVE=1)
  allot sell <token> <amt>
  allot token                 $ALLOT on chain: supply, price, holders
  allot history               the public registry
  allot anchor                anchor pending entries on Solana now
  allot revoke [--sweep]      stop the agent; --sweep sends the funds to the owner
  allot unrevoke
  allot mcp                   run the MCP server (stdio)
  allot serve                 site, dashboard and /verify on :4340
  allot config claude|chatgpt print the install snippet

cluster: ${CLUSTER} · trading: ${LIVE_TRADING ? "LIVE" : "simulated"}`;

async function main() {
  switch (cmd) {
    case "init": {
      const r = createAgent(args[0] || "agent");
      const a = loadAgent();
      writeJson("server.json", { mcpKey: randomBytes(16).toString("hex") });
      await record(a, "wallet.created", { cluster: CLUSTER });
      await record(a, "policy.set", r.policy);
      show({ address: r.address, cluster: CLUSTER, allotment: r.policy, next: CLUSTER === "mainnet" ? `Send SOL or USDC to ${r.address}` : "allot airdrop 1" });
      break;
    }
    case "status": show({ ...(await core.wallet()), budget: await core.budget() }); break;
    case "budget": show(await core.budget()); break;
    case "airdrop": { const a = need(); show({ signature: await airdrop(a.address, Number(args[0] || 1)), wallet: await core.wallet() }); break; }
    case "policy": {
      if (!args.length) { show(getPolicy()); break; }
      const a = need();
      const p = setPolicy({ [args[0]]: args.slice(1).join(" ") });
      await record(a, "policy.set", p);
      show(p);
      break;
    }
    case "pay": show(await core.pay({ url: args[0], method: flag("--post") ? "POST" : "GET" })); break;
    case "buy": case "sell": {
      const q = await core.quote({ side: cmd, token: args[0], amount: Number(args[1]), quote: flag("--usdc") ? "USDC" : "SOL" });
      show(q);
      if (q.quoteId) show(await core.swap({ quoteId: q.quoteId }));
      break;
    }
    case "quote": show(await core.quote({ side: args[0], token: args[1], amount: Number(args[2]) })); break;
    case "swap": show(await core.swap({ quoteId: args[0] })); break;
    case "token": show(await core.token()); break;
    case "history": show(await core.history({ limit: Number(args[0] || 20) })); break;
    case "anchor": show((await anchor(need())) ?? "Nothing to anchor."); break;
    case "revoke": {
      const a = need();
      setPolicy({ revoked: true });
      const owner = getPolicy().owner;
      const swept = flag("--sweep") ? (owner ? await sweep(a, owner) : "no owner set: `allot policy owner <address>`") : null;
      await record(a, "revoke", { sweptTo: flag("--sweep") ? owner : null, signature: typeof swept === "string" && swept.length > 60 ? swept : null });
      await anchor(a).catch(() => null);
      show({ revoked: true, swept });
      break;
    }
    case "unrevoke": { const a = need(); setPolicy({ revoked: false }); await record(a, "unrevoke", {}); show("Allotment active again."); break; }
    case "mcp": await import("../mcp/server.mjs"); break;
    case "serve": await import("../server.mjs"); break;
    case "config": {
      const mcp = join(root, "mcp/server.mjs");
      if (args[0] === "chatgpt") show(`ChatGPT → Settings → Connectors → Create. MCP server URL: <your https tunnel>/mcp/${readJson("server.json")?.mcpKey ?? "<run allot init>"}  (auth: none; the key in the path is the secret)`);
      else show({ mcpServers: { allot: { command: "node", args: [mcp], env: { ALLOT_CLUSTER: CLUSTER } } } });
      break;
    }
    default: show(HELP);
  }
}

main().catch((e) => { console.error(`allot: ${e.message}`); process.exit(1); });
