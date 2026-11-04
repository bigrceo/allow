// Solana plumbing, ported from SAY (src/swap/solana.ts).
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { MAINNET_RPC, RPC_URL } from "./config.mjs";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const LAMPORTS = 1_000_000_000;

let conn, main;
export const connection = () => (conn ??= new Connection(RPC_URL, "confirmed"));
export const mainnet = () => (main ??= new Connection(MAINNET_RPC, "confirmed"));

export const isAddress = (s) => {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s))) return false;
  try { new PublicKey(s); return true; } catch { return false; }
};

export async function sendSigned(c, signed, lastValidBlockHeight) {
  const blockhash = VersionedTransaction.deserialize(signed).message.recentBlockhash;
  const sig = await c.sendRawTransaction(signed, { skipPreflight: true, maxRetries: 3 });
  const res = await c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new AllotError(`Failed on chain: ${JSON.stringify(res.value.err).slice(0, 120)}`);
  return sig;
}

export class AllotError extends Error {}
