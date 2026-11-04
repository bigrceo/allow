# Install

## 1. Wallet
```bash
npx allot-kit init
npx allot-kit policy perTxUsd 10
npx allot-kit policy dailyUsd 50
npx allot-kit policy owner <your wallet>     # for revoke --sweep
```
Fund the printed address with SOL or USDC. Test first with `ALLOT_CLUSTER=localnet` (`solana-test-validator`, then `allot airdrop 2`) or devnet (faucet.solana.com: the RPC faucet is closed).

## 2. Claude Desktop
Settings → Developer → Edit Config:
```json
{ "mcpServers": { "allot": { "command": "npx", "args": ["-y", "allot-kit", "mcp"] } } }
```
From a clone: `"command": "node", "args": ["/path/to/agentkit/mcp/server.mjs"]`. `allot config claude` prints it.

## 3. Claude Code
```bash
claude mcp add allot -- npx -y allot-kit mcp
```

## 4. ChatGPT
ChatGPT needs a remote HTTPS MCP server.
```bash
npx allot-kit serve
cloudflared tunnel --url http://localhost:4340
npx allot-kit config chatgpt
```
Settings → Apps & Connectors → Advanced → Developer mode → Create. URL `https://<tunnel>/mcp/<key>`, no auth.

## 5. Live trading
Only with `ALLOT_CLUSTER=mainnet ALLOT_LIVE=1` and a funded wallet. Everything else simulates the fill at the live Jupiter quote.
