// The agent wallet and its allotment. The key lives on the owner's machine (non-custodial: Allot never holds it).
// The policy is the owner's: no MCP tool can raise it. Revoke stops every write and can sweep funds back.
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { CLUSTER } from "./config.mjs";
import { AllotError, connection, LAMPORTS } from "./solana.mjs";
import { readJson, writeJson } from "./store.mjs";

export const DEFAULT_POLICY = {
  perTxUsd: 25, dailyUsd: 100, totalUsd: 250,
  maxSlippageBps: 500,
  payHosts: ["localhost", "127.0.0.1", "allot.fun"], // x402 endpoints the agent may pay
  tokens: "any", // or a list of mints; tokens with freeze authority on are always refused
  owner: null, // where `revoke --sweep` sends the funds
  expiresAt: null,
  revoked: false,
};

export function loadAgent() {
  const a = readJson("agent.json");
  if (!a) return null;
  return { ...a, keypair: Keypair.fromSecretKey(bs58.decode(a.secretKey)) };
}

export function createAgent(name = "agent") {
  if (readJson("agent.json")) throw new AllotError("An agent wallet already exists here. One wallet per ALLOT_HOME.");
  const kp = Keypair.generate();
  writeJson("agent.json", { name, address: kp.publicKey.toBase58(), cluster: CLUSTER, createdAt: new Date().toISOString(), secretKey: bs58.encode(kp.secretKey) });
  const policy = { ...DEFAULT_POLICY, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() };
  writeJson("policy.json", policy);
  return { address: kp.publicKey.toBase58(), policy };
}

export const getPolicy = () => ({ ...DEFAULT_POLICY, ...readJson("policy.json", {}) });

const NUM = ["perTxUsd", "dailyUsd", "totalUsd", "maxSlippageBps"];
/** Owner-side only (CLI / dashboard on localhost). Validates every field. */
export function setPolicy(patch) {
  const cur = getPolicy(), next = { ...cur };
  for (const [k, v] of Object.entries(patch)) {
    if (NUM.includes(k)) { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new AllotError(`${k} must be a positive number.`); next[k] = n; }
    else if (k === "payHosts") next[k] = (Array.isArray(v) ? v : String(v).split(",")).map((h) => h.trim().toLowerCase()).filter(Boolean);
    else if (k === "tokens") next[k] = v === "any" ? "any" : (Array.isArray(v) ? v : String(v).split(",")).map((m) => m.trim()).filter(Boolean);
    else if (k === "owner") { if (v) new PublicKey(v); next[k] = v || null; }
    else if (k === "expiresAt") next[k] = v ? new Date(v).toISOString() : null;
    else if (k === "revoked") next[k] = v === true || v === "true" || v === "1";
    else throw new AllotError(`Unknown policy field: ${k}`);
  }
  if (next.maxSlippageBps > 3000) throw new AllotError("maxSlippageBps is capped at 3000 (30%).");
  writeJson("policy.json", next);
  return next;
}

export async function solBalance(address) {
  return (await connection().getBalance(new PublicKey(address))) / LAMPORTS;
}

/** Devnet/localnet only: free SOL to test with. */
export async function airdrop(address, sol = 1) {
  if (CLUSTER === "mainnet") throw new AllotError("No airdrops on mainnet.");
  const c = connection();
  const sig = await c.requestAirdrop(new PublicKey(address), Math.round(sol * LAMPORTS));
  const bh = await c.getLatestBlockhash();
  await c.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  return sig;
}

/** Sends everything but the fee back to the owner. Used by `revoke --sweep`. */
export async function sweep(agent, to) {
  const c = connection();
  const bal = await c.getBalance(agent.keypair.publicKey);
  const lamports = bal - 5000;
  if (lamports <= 0) return null;
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: agent.keypair.publicKey, toPubkey: new PublicKey(to), lamports }));
  return sendAndConfirmTransaction(c, tx, [agent.keypair], { commitment: "confirmed" });
}

/**
 * Localnet only: a stand-in USDC (6 decimals) minted to the agent, so the USDC x402 path can be shown with an
 * agent that holds zero SOL. The mint and its authority are recorded in ~/.allot/local-usdc.json.
 */
export async function localUsdc(agentAddress, amount = 10) {
  if (CLUSTER !== "localnet") throw new AllotError("Test USDC is for localnet. On devnet use faucet.circle.com; on mainnet, real USDC.");
  const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = await import("@solana/spl-token");
  const c = connection();
  let rec = readJson("local-usdc.json");
  let auth;
  if (!rec || !(await c.getAccountInfo(new PublicKey(rec.mint)))) {
    auth = Keypair.generate();
    await airdrop(auth.publicKey.toBase58(), 1);
    const mint = await createMint(c, auth, auth.publicKey, null, 6);
    rec = { mint: mint.toBase58(), authority: bs58.encode(auth.secretKey) };
    writeJson("local-usdc.json", rec);
  } else auth = Keypair.fromSecretKey(bs58.decode(rec.authority));
  const ata = await getOrCreateAssociatedTokenAccount(c, auth, new PublicKey(rec.mint), new PublicKey(agentAddress));
  await mintTo(c, auth, new PublicKey(rec.mint), ata.address, auth, BigInt(Math.round(amount * 1e6)));
  return { mint: rec.mint, minted: amount, to: agentAddress };
}
