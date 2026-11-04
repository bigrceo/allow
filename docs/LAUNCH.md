# Allow: launch kit

**Hook** Give your agent a wallet. Sealed by your rules.
**Line** Your agent can trade. It can't touch more than you allow. Nobody can.
**Meta** Agent tools (Rialto, Volition, Rise) + sealed / untouchable launches (Nullary): Allow is the sealed wallet for agents.

**Name** Allow · **Ticker** $ALLOW (free on Solana per DexScreener, 04/11/2026; a $9K one exists on Polygon) · **Domain** useallow.xyz (free, whois Radix; allow.fun is taken) · **X** @useallow (to check by hand) · **npm** allow-kit (`allow` is taken)
**Logo** `web/logo.svg`: a disc with its quarter set aside, one color #FF5A1F, no stroke.

## pump.fun
- Name: Allow · Ticker: ALLOW
- Description: Give your agent a wallet. Claude or ChatGPT gets a Solana wallet with a budget it can't break: pays APIs over x402, trades any token through Jupiter, every action in a public registry anchored on Solana. useallow.xyz
- Image: `web/logo.svg` on #0B0B0C (export 1000×1000)

## X profile
- Bio: Give your agent a wallet. x402 payments, real Solana trades, a public registry. Revoke in one command. $ALLOW
- Banner line: Give your agent a wallet.

## Angle vs the meta (Rialto, Rise, Volition)
Rialto pays for inference. Rise lends to agents. **Allow lets the agent trade**, inside caps you set, and proves every trade on chain. Show it, don't say it.

## Posts
1. Give your agent a wallet. Claude gets a Solana address, a $25-per-action allowance, and six tools. It pays, it trades, it writes everything down in public. $ALLOW
2. (video, how it works) "Put $5 into BONK" → budget → quote → swap → registry #4 → /verify goes green, memo read straight from Solana.
3. Other kits let the agent pay. This one lets it trade. Any Solana token, priced on Jupiter, freeze-authority tokens refused, floor re-checked before signing.
4. Over budget, it stops. Revoked, it stops. `allow revoke --sweep` and the funds go home. The revocation is in the registry too.
5. Don't trust our dashboard. Every action is hash-chained, signed by the agent's key, rolled into a Merkle root posted as an SPL Memo. /verify checks it in your browser.
6. LIVE: CA → (empty until launch)

## Live stream script (5 min)
1. `allow status` on screen: address, $250 allowance.
2. In Claude: "what's my budget?" → "pay the price API for WIF" (x402, real tx on devnet/localnet).
3. "Buy $2 of WIF" → quote, swap. Mainnet live only if Rayane switches `ALLOW_LIVE=1` himself with a funded wallet.
4. "Buy $500 of WIF" → refused by the cap. Say it out loud: the model can't raise it.
5. Dashboard → Revoke → ask Claude to trade → refused.
6. /verify on the last entry: five green checks.
