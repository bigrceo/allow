# Allow security model

| # | Risk | Status | How |
|---|---|---|---|
| 1 | The model raises its own budget | blocked | No MCP tool writes the policy. Owner routes (`/api/owner/*`) answer only to 127.0.0.1 without `x-forwarded-for`, never through a tunnel. |
| 2 | Prompt injection makes it pay a stranger | limited | `allow_pay` only pays hosts on `payHosts`; price checked against caps and optional `maxUsd` before signing. |
| 3 | Overspend | blocked | Per action, 24 h, total caps computed from the registry itself before any signature. Sells don't spend but need an active allowance. |
| 4 | Honeypot tokens | blocked | Freeze authority on → refused. Mint authority, thin liquidity, concentration → warnings in the quote. |
| 5 | Price moves between quote and swap | blocked | Quotes are single use, 60 s. Re-quote before signing; abort if under the floor shown; Jupiter enforces the floor on chain. |
| 6 | Token names carrying instructions | mitigated | Names/symbols stripped of control, bidi and markup characters, length-capped (from SAY). |
| 7 | Registry rewritten after the fact | detectable | Entries hash-chained and signed by the agent key; Merkle roots in SPL Memos signed by the same key. `/verify` checks all of it in the browser against an RPC. |
| 8 | Key theft | owner's machine | The key is a file (mode 600) in `~/.allow`. Allow is non-custodial: no server holds it. Use a small hot wallet. |
| 9 | Seller replays a payment | blocked | The payment is a signed transaction with a recent blockhash; the chain rejects duplicates. |
| 10 | Remote MCP abused | limited | `/mcp/<key>`: 128-bit random path, 404 otherwise. Anyone with the URL can use the agent within its allowance; rotate by editing `~/.allow/server.json`. |

Not done yet: on-chain enforcement of caps (SPL `approve` delegation or a program), multi-agent wallets, signed policy history.
