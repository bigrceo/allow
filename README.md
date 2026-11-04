# Allow

**Give your agent a wallet.** Claude, ChatGPT or any MCP client gets a Solana wallet with an allowance. It pays APIs over x402, trades any Solana token through Jupiter, and every action lands in a public registry anchored on Solana.

```bash
npm i -g https://useallow.xyz/downloads/allow-kit-0.1.0.tgz && allow init          # wallet + allowance in ~/.allow
allow serve         # site, dashboard, /verify on :4340
claude mcp add allow -- npx -y https://useallow.xyz/downloads/allow-kit-0.1.0.tgz mcp
```

| Part | Where |
|---|---|
| MCP tools: `allow_wallet` `allow_budget` `allow_pay` `allow_quote` `allow_swap` `allow_token` `allow_history` | `mcp/tools.mjs` (stdio `mcp/server.mjs`, HTTP `/mcp/<key>`) |
| Wallet + allowance (caps, pay list, token list, expiry, revoke, sweep) | `lib/wallet.mjs`, `lib/core.mjs#guard` |
| x402 client and seller (Solana, `exact` scheme, USDC with seller-paid fee or SOL) | `lib/x402.mjs`, demo endpoints `/x402/price`, `/x402/sol` |
| Trading (Jupiter, ported from SAY) | `lib/jupiter.mjs`, `lib/core.mjs#quote/swap` |
| Registry: hash chain, ed25519, Merkle root in SPL Memo (from HUSH) | `lib/registry.mjs`, `lib/merkle.mjs`, `/verify` |
| CLI | `bin/allow.mjs` |
| Brand (name, colors, logo) | `brand.mjs`, the only place |

**Modes.** `ALLOW_CLUSTER=localnet|devnet|mainnet` (default devnet). Prices always come from Jupiter mainnet. Swaps are simulated (paper fill at the fresh quote, marked `simulated` in the registry) unless `ALLOW_CLUSTER=mainnet` **and** `ALLOW_LIVE=1`. x402 payments and registry anchors are real transactions on the chosen cluster.

**Demo.** `node scripts/demo.mjs BONK` pays the x402 price API, buys, sells half, prints the registry.

Every claim, mapped to code and to a way to check it: [CLAIMS.md](CLAIMS.md).

Install for Claude and ChatGPT: [docs/INSTALL.md](docs/INSTALL.md). Security model: [SECURITY.md](SECURITY.md).

**Deploy.** `npm run pack` writes `web/downloads/allow-kit-<version>.tgz`, which the site serves for the one-line install.
