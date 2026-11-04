# Agents working on Allow
- Plain Node ESM, no build step. `npm test`, `node server.mjs` (PORT, default 4340).
- Brand lives only in `brand.mjs`; pages fill `[data-b]` / `[data-logo]` from it.
- Never send a mainnet transaction without the owner: live swaps need `ALLOW_CLUSTER=mainnet` + `ALLOW_LIVE=1`.
- Labels: Inter, uppercase, never monospace. No tinted-background pills. Real logos of cited brands (`web/logos`). No sound.
- `lib/jupiter.mjs` and `lib/solana.mjs` come from ~/say; `lib/merkle.mjs` from ~/hush. Port fixes back by hand.
