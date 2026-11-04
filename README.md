# Allot

**Give your agent a wallet.** Claude, ChatGPT or any MCP client gets a Solana wallet with an allotment. It pays APIs over x402, trades any Solana token through Jupiter, and every action lands in a public registry anchored on Solana.

```bash
npm i -g https://allot.fun/downloads/allot-kit-0.1.0.tgz && allot init          # wallet + allotment in ~/.allot
allot serve         # site, dashboard, /verify on :4340
claude mcp add allot -- npx -y https://allot.fun/downloads/allot-kit-0.1.0.tgz mcp
```

| Part | Where |
|---|---|
| MCP tools: `allot_wallet` `allot_budget` `allot_pay` `allot_quote` `allot_swap` `allot_token` `allot_history` | `mcp/tools.mjs` (stdio `mcp/server.mjs`, HTTP `/mcp/<key>`) |
| Wallet + allotment (caps, pay list, token list, expiry, revoke, sweep) | `lib/wallet.mjs`, `lib/core.mjs#guard` |
| x402 client and seller (Solana, `exact` scheme) | `lib/x402.mjs`, demo endpoints `/x402/price`, `/x402/sol` |
| Trading (Jupiter, ported from SAY) | `lib/jupiter.mjs`, `lib/core.mjs#quote/swap` |
| Registry: hash chain, ed25519, Merkle root in SPL Memo (from HUSH) | `lib/registry.mjs`, `lib/merkle.mjs`, `/verify` |
| CLI | `bin/allot.mjs` |
| Brand (name, colors, logo) | `brand.mjs`, the only place |

**Modes.** `ALLOT_CLUSTER=localnet|devnet|mainnet` (default devnet). Prices always come from Jupiter mainnet. Swaps are simulated (paper fill at the fresh quote, marked `simulated` in the registry) unless `ALLOT_CLUSTER=mainnet` **and** `ALLOT_LIVE=1`. x402 payments and registry anchors are real transactions on the chosen cluster.

**Demo.** `node scripts/demo.mjs BONK` pays the x402 price API, buys, sells half, prints the registry.

Install for Claude and ChatGPT: [docs/INSTALL.md](docs/INSTALL.md). Security model: [SECURITY.md](SECURITY.md).

**Deploy.** `npm run pack` writes `web/downloads/allot-kit-<version>.tgz`, which the site serves for the one-line install.
