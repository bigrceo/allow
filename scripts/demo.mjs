// Live demo, one command: an agent pays an x402 API, buys a token, sells part of it, shows its registry.
// Needs `allot serve` running and a funded wallet (localnet/devnet: `allot airdrop 1`).
import { SITE_URL } from "../lib/config.mjs";
import * as core from "../lib/core.mjs";

const step = async (t, fn) => { console.log(`\n▸ ${t}`); const r = await fn(); console.log(JSON.stringify(r, null, 2)); return r; };
const token = process.argv[2] || "BONK";
await step("Budget", core.budget);
await step(`Pay the x402 price API for ${token}`, () => core.pay({ url: `${SITE_URL}/x402/price?token=${token}` }));
const q = await step(`Quote: buy 0.02 SOL of ${token}`, () => core.quote({ side: "buy", token, amount: 0.02 }));
const b = await step("Swap", () => core.swap({ quoteId: q.quoteId }));
const half = Math.floor(parseFloat(b.received) / 2);
const s = await step(`Quote: sell ${half} ${token}`, () => core.quote({ side: "sell", token, amount: half }));
await step("Swap", () => core.swap({ quoteId: s.quoteId }));
const h = await core.history({ limit: 5 });
console.log(`\n▸ Registry: ${h.count} entries. Check any of them at ${SITE_URL}/verify?seq=${h.entries[0].seq}`);
