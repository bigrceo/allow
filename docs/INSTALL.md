# Install

## 1. Wallet
```bash
npm i -g https://useallow.xyz/downloads/allow-kit-0.1.0.tgz && allow init
allow policy perTxUsd 10
allow policy dailyUsd 50
allow policy owner <your wallet>     # for revoke --sweep
```
Fund the printed address with USDC (enough for x402: the seller pays the fee) plus a little SOL to anchor and trade. Localnet: `allow usdc 10` mints test USDC. Test first with `ALLOW_CLUSTER=localnet` (`solana-test-validator`, then `allow airdrop 2`) or devnet (faucet.solana.com: the RPC faucet is closed).

## 2. Claude Desktop
Settings → Developer → Edit Config:
```json
{ "mcpServers": { "allow": { "command": "npx", "args": ["-y", "https://useallow.xyz/downloads/allow-kit-0.1.0.tgz", "mcp"] } } }
```
From a clone: `"command": "node", "args": ["/path/to/agentkit/mcp/server.mjs"]`. `allow config claude` prints it.

## 3. Claude Code
```bash
claude mcp add allow -- npx -y https://useallow.xyz/downloads/allow-kit-0.1.0.tgz mcp
```

## 4. ChatGPT
ChatGPT needs a remote HTTPS MCP server.
```bash
allow serve
cloudflared tunnel --url http://localhost:4340
allow config chatgpt
```
Settings → Apps & Connectors → Advanced → Developer mode → Create. URL `https://<tunnel>/mcp/<key>`, no auth.

## 5. Live trading
Only with `ALLOW_CLUSTER=mainnet ALLOW_LIVE=1` and a funded wallet. Everything else simulates the fill at the live Jupiter quote.
