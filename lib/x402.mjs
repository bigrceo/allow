// x402 on Solana, both sides. Client: answer a 402 with a signed transfer. Server: verify it, settle it, serve.
// Native SOL ("SOL") or any SPL mint as the asset. The payer signs and pays the fee; the seller settles.
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { CLUSTER } from "./config.mjs";
import { AllotError, connection } from "./solana.mjs";

export const NETWORK = CLUSTER === "mainnet" ? "solana" : `solana-${CLUSTER}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64");
const unb64 = (s) => JSON.parse(Buffer.from(s, "base64").toString("utf8"));

/** Picks the first requirement this wallet can pay on this network. */
export function pickRequirement(body) {
  const reqs = (body?.accepts ?? []).filter((r) => r.scheme === "exact" && r.network === NETWORK);
  if (!reqs.length) throw new AllotError(`This endpoint does not take payment on ${NETWORK}.`);
  return reqs[0];
}

export async function buildPayment(req, keypair) {
  const c = connection();
  const payTo = new PublicKey(req.payTo), amount = BigInt(req.maxAmountRequired);
  const tx = new Transaction();
  if (req.asset === "SOL") tx.add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: payTo, lamports: amount }));
  else {
    const mint = new PublicKey(req.asset), info = await getMint(c, mint);
    tx.add(createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, keypair.publicKey), mint, getAssociatedTokenAddressSync(mint, payTo, true), keypair.publicKey, amount, info.decimals));
  }
  tx.feePayer = keypair.publicKey;
  tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
  tx.sign(keypair);
  return b64({ x402Version: 1, scheme: "exact", network: NETWORK, payload: { transaction: tx.serialize().toString("base64") } });
}

export const decodeReceipt = (h) => (h ? unb64(h) : null);

// ---------- seller side (used by the demo endpoints on this server) ----------

export function requirement({ resource, description, lamports, payTo }) {
  return { scheme: "exact", network: NETWORK, asset: "SOL", maxAmountRequired: String(lamports), payTo, resource, description, mimeType: "application/json", maxTimeoutSeconds: 60 };
}

/** Checks the X-PAYMENT header pays `req` exactly, then submits it. Returns the signature. */
export async function settle(header, req) {
  const p = unb64(header);
  if (p.scheme !== "exact" || p.network !== req.network) throw new AllotError("Wrong scheme or network.");
  const tx = Transaction.from(Buffer.from(p.payload.transaction, "base64"));
  if (!tx.verifySignatures()) throw new AllotError("Bad signature.");
  const ok = tx.instructions.some((ix) => {
    if (!ix.programId.equals(SystemProgram.programId) || ix.data.readUInt32LE(0) !== 2) return false;
    return ix.keys[1].pubkey.toBase58() === req.payTo && ix.data.readBigUInt64LE(4) >= BigInt(req.maxAmountRequired);
  });
  if (!ok || tx.instructions.length !== 1) throw new AllotError("The transaction does not pay this requirement.");
  const c = connection();
  const sig = await c.sendRawTransaction(tx.serialize());
  const bh = await c.getLatestBlockhash();
  const r = await c.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  if (r.value.err) throw new AllotError("Payment failed on chain.");
  return { sig, payer: tx.feePayer.toBase58(), header: b64({ success: true, transaction: sig, network: req.network, payer: tx.feePayer.toBase58() }) };
}
