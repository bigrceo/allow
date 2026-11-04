// The Allot tool set, registered on any McpServer (stdio for Claude, HTTP for ChatGPT).
import { z } from "zod";
import * as core from "../lib/core.mjs";
import { BRAND } from "../brand.mjs";

const out = (o) => ({ content: [{ type: "text", text: typeof o === "string" ? o : JSON.stringify(o, null, 2) }] });
const safe = (fn) => async (args) => { try { return out(await fn(args ?? {})); } catch (e) { return { ...out(`Error: ${e.message}`), isError: true }; } };

export function registerTools(server) {
  server.tool("allot_wallet", `${BRAND.name}: the agent's own Solana wallet. Address, cluster, SOL balance, trading mode, holdings.`, {}, safe(core.wallet));
  server.tool("allot_budget", "The allotment the owner gave this agent: caps per action, per 24 h and in total, what is used and what is left. Check it before spending.", {}, safe(core.budget));
  server.tool(
    "allot_pay",
    "Fetch a URL; if it answers HTTP 402 (x402), pay it from the agent wallet and return the paid response. Refused if the host is not allowlisted or the price breaks a cap. Every payment is written to the public registry.",
    { url: z.string().url(), method: z.enum(["GET", "POST"]).optional(), body: z.record(z.any()).optional(), maxUsd: z.number().positive().optional().describe("refuse if the endpoint asks more than this") },
    safe(core.pay),
  );
  server.tool(
    "allot_quote",
    "Price a trade of any Solana token through Jupiter. Nothing moves. Returns a quoteId (valid 60 s) to pass to allot_swap. Tokens with a freeze authority are refused.",
    {
      side: z.enum(["buy", "sell"]), token: z.string().describe("ticker, name or mint address"),
      amount: z.number().positive().describe("buy: how much SOL/USDC to spend. sell: how many tokens to sell"),
      quote: z.enum(["SOL", "USDC"]).optional(), slippageBps: z.number().int().optional(),
    },
    safe(core.quote),
  );
  server.tool("allot_swap", "Execute a quote from allot_quote. Re-prices first and aborts if the market moved past the floor shown. Counts against the allotment and is written to the public registry.", { quoteId: z.string() }, safe(core.swap));
  server.tool("allot_history", "The agent's public registry: every payment and trade, hash-chained, signed, anchored on Solana.", { limit: z.number().int().min(1).max(100).optional() }, safe(core.history));
}
