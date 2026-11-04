// x402 on Solana, both sides. Client: answer a 402 with a signed transfer. Server: verify it, settle it, serve.
// Two assets:
//   SOL   the payer signs and pays the network fee.
//   USDC  (any SPL mint) the seller is the fee payer (`extra.feePayer`): the agent only signs the transfer,
//         so a wallet holding nothing but USDC can pay. The seller co-signs and submits.
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, decodeTransferCheckedInstruction, getAccount, getAssociatedTokenAddressSync, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CLUSTER } from "./config.mjs";
import { AllotError, connection } from "./solana.mjs";
import { readJson } from "./store.mjs";

export const NETWORK = CLUSTER === "mainnet" ? "solana" : `solana-${CLUSTER}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64");
const unb64 = (s) => JSON.parse(Buffer.from(s, "base64").toString("utf8"));

// USDC per cluster. Localnet has no USDC: `allot usdc` mints a local stand-in and records it here.
const USDC = { mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" };
export const usdcMint = () => process.env.ALLOT_USDC_MINT || USDC[CLUSTER] || readJson("local-usdc.json")?.mint || null;

/** USDC balance (ui units) of a wallet on this cluster, 0 if it has no account. */
export async function usdcBalance(owner) {
  const mint = usdcMint();
  if (!mint) return 0;
  try { return Number((await getAccount(connection(), getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner)))).amount) / 1e6; } catch { return 0; }
}

/** USDC when the endpoint takes it and the wallet can cover it (no SOL needed), otherwise SOL. */
export async function pickRequirement(body, owner) {
  const reqs = (body?.accepts ?? []).filter((r) => r.scheme === "exact" && r.network === NETWORK);
  if (!reqs.length) throw new AllotError(`This endpoint does not take payment on ${NETWORK}.`);
  const usdc = reqs.find((r) => r.asset === usdcMint());
  if (usdc && (await usdcBalance(owner)) * 1e6 >= Number(usdc.maxAmountRequired)) return usdc;
  return reqs.find((r) => r.asset === "SOL") ?? usdc ?? reqs[0];
}

export async function buildPayment(req, keypair) {
  const c = connection();
  const payTo = new PublicKey(req.payTo), amount = BigInt(req.maxAmountRequired);
  const tx = new Transaction();
  if (req.asset === "SOL") {
    tx.add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: payTo, lamports: amount }));
    tx.feePayer = keypair.publicKey;
  } else {
    const mint = new PublicKey(req.asset), info = await getMint(c, mint);
    tx.add(createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, keypair.publicKey), mint, getAssociatedTokenAddressSync(mint, payTo, true), keypair.publicKey, amount, info.decimals));
    tx.feePayer = req.extra?.feePayer ? new PublicKey(req.extra.feePayer) : keypair.publicKey;
  }
  tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
  tx.partialSign(keypair);
  return b64({ x402Version: 1, scheme: "exact", network: NETWORK, payload: { transaction: tx.serialize({ requireAllSignatures: false }).toString("base64") } });
}

export const decodeReceipt = (h) => (h ? unb64(h) : null);

// ---------- seller side (used by the demo endpoints on this server) ----------

export function requirement({ resource, description, lamports, payTo }) {
  return { scheme: "exact", network: NETWORK, asset: "SOL", maxAmountRequired: String(lamports), payTo, resource, description, mimeType: "application/json", maxTimeoutSeconds: 60 };
}

export function usdcRequirement({ resource, description, micros, payTo, feePayer }) {
  return { scheme: "exact", network: NETWORK, asset: usdcMint(), maxAmountRequired: String(micros), payTo, resource, description, mimeType: "application/json", maxTimeoutSeconds: 60, extra: { name: "USDC", decimals: 6, feePayer } };
}

/**
 * Checks the X-PAYMENT header pays `req` and nothing else, then submits it. For USDC the seller is the fee
 * payer, so the transaction must be exactly one TransferChecked into the seller's account: anything more
 * could spend the seller's SOL.
 */
export async function settle(header, req, sellerKey) {
  const p = unb64(header);
  if (p.scheme !== "exact" || p.network !== req.network) throw new AllotError("Wrong scheme or network.");
  const tx = Transaction.from(Buffer.from(p.payload.transaction, "base64"));
  if (tx.instructions.length !== 1) throw new AllotError("The transaction must hold exactly one transfer.");
  const ix = tx.instructions[0];
  let payer;
  if (req.asset === "SOL") {
    const ok = ix.programId.equals(SystemProgram.programId) && ix.data.readUInt32LE(0) === 2 && ix.keys[1].pubkey.toBase58() === req.payTo && ix.data.readBigUInt64LE(4) >= BigInt(req.maxAmountRequired);
    if (!ok) throw new AllotError("The transaction does not pay this requirement.");
    if (!tx.verifySignatures()) throw new AllotError("Bad signature.");
    payer = tx.feePayer.toBase58();
  } else {
    if (!ix.programId.equals(TOKEN_PROGRAM_ID)) throw new AllotError("Not an SPL token transfer.");
    const d = decodeTransferCheckedInstruction(ix);
    const dest = getAssociatedTokenAddressSync(new PublicKey(req.asset), new PublicKey(req.payTo), true);
    if (!d.keys.mint.pubkey.equals(new PublicKey(req.asset)) || !d.keys.destination.pubkey.equals(dest) || d.data.amount < BigInt(req.maxAmountRequired)) throw new AllotError("The transaction does not pay this requirement.");
    payer = d.keys.owner.pubkey.toBase58();
    if (payer === req.extra?.feePayer) throw new AllotError("The seller can't pay itself.");
    if (req.extra?.feePayer) {
      if (tx.feePayer?.toBase58() !== req.extra.feePayer || !sellerKey) throw new AllotError("Wrong fee payer.");
      tx.partialSign(sellerKey);
    }
    if (!tx.verifySignatures()) throw new AllotError("Bad signature.");
  }
  const c = connection();
  const sig = await c.sendRawTransaction(tx.serialize());
  const bh = await c.getLatestBlockhash();
  const r = await c.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  if (r.value.err) throw new AllotError("Payment failed on chain.");
  return { sig, payer, header: b64({ success: true, transaction: sig, network: req.network, payer }) };
}

