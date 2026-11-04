import { homedir } from "node:os";
import { join } from "node:path";

// Cluster for wallet, x402 payments and registry anchors. Trades always price on mainnet (Jupiter has no devnet).
export const CLUSTER = process.env.ALLOT_CLUSTER || "devnet"; // localnet | devnet | mainnet
const RPCS = { localnet: "http://127.0.0.1:8899", devnet: "https://api.devnet.solana.com", mainnet: "https://api.mainnet-beta.solana.com" };
export const RPC_URL = process.env.ALLOT_RPC_URL || RPCS[CLUSTER] || RPCS.devnet;
export const MAINNET_RPC = process.env.HELIUS_RPC_URL || RPCS.mainnet;
// Real swaps need mainnet AND an explicit switch. Anything else is a simulated fill at the live Jupiter quote.
export const LIVE_TRADING = CLUSTER === "mainnet" && process.env.ALLOT_LIVE === "1";
export const HOME = process.env.ALLOT_HOME || join(homedir(), ".allot");
export const PORT = Number(process.env.PORT || 4340);
export const SITE_URL = process.env.ALLOT_URL || `http://localhost:${PORT}`;
export const explorerTx = (sig) => `https://solscan.io/tx/${sig}${CLUSTER === "mainnet" ? "" : CLUSTER === "devnet" ? "?cluster=devnet" : `?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`}`;
