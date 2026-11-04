# Every claim, and where to check it

Allow says only what the code does. Each line points at the code and at a way to check it yourself.

| Claim | Code | Check it |
|---|---|---|
| The agent gets its own Solana wallet; the key stays on your machine | `lib/wallet.mjs` `createAgent` (key in `~/.allow/agent.json`, mode 600) | `allow init`, then `ls -l ~/.allow` |
| Caps per action, per 24 h, in total, checked before anything is signed | `lib/core.mjs` `guard` | `allow buy JUP 5` with a $25 cap: refused, nothing signed |
| The model can't raise its caps | `mcp/tools.mjs` (no tool writes the policy); `server.mjs` owner routes answer only on 127.0.0.1 | list the 7 tools in any MCP client |
| Revoke stops every write, `--sweep` sends funds home | `bin/allow.mjs` `revoke`, `lib/wallet.mjs` `sweep` | `allow revoke`, then any `allow buy`: refused |
| Pays x402 APIs in USDC with zero SOL (seller pays the fee) or in SOL | `lib/x402.mjs` `buildPayment`, `settle` | `allow usdc 5` on localnet, `allow pay <url>`: SOL balance stays 0 |
| The seller refuses any payment that is not exactly one transfer | `lib/x402.mjs` `settle` | `npm test` (`test/x402.test.mjs`) |
| Trades any Solana token through Jupiter | `lib/jupiter.mjs`, `lib/core.mjs` `quote` / `swap` | `allow quote buy BONK 0.02`: live mainnet quote |
| Refuses tokens whose creator can freeze holders | `lib/core.mjs` `quote` (freeze authority check) | quote any token with a freeze authority |
| Re-prices before signing and aborts past the floor shown | `lib/core.mjs` `swap` | read `swap`: fresh quote vs `minOut` |
| **Swaps are simulated unless you switch live mode on** | `lib/config.mjs` `LIVE_TRADING` (mainnet **and** `ALLOW_LIVE=1`) | the registry marks every fill `simulated` or `live` |
| Every action is hash-chained and signed by the agent key | `lib/registry.mjs` `record`, `lib/merkle.mjs` `entryHash` | `/verify`: entry hash + ed25519 signature |
| Batches are anchored on Solana as an SPL Memo signed by the agent | `lib/registry.mjs` `anchor` | `/verify` reads the memo from a Solana RPC in your browser |
| Works with Claude and ChatGPT | `mcp/server.mjs` (stdio), `server.mjs` `/mcp/<key>` (HTTP) | `npm test` (`test/mcp.test.mjs` runs the real MCP client) |

What Allow does **not** claim: caps enforced by an on-chain program (they run next to the key, in software), custody, yield, or returns. Trading can lose money.
