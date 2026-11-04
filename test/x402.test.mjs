// The seller co-signs USDC payments as fee payer, so settle() must refuse anything but one exact transfer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { settle, NETWORK } from "../lib/x402.mjs";

const mint = Keypair.generate().publicKey, seller = Keypair.generate(), agent = Keypair.generate();
const req = { scheme: "exact", network: NETWORK, asset: mint.toBase58(), maxAmountRequired: "100000", payTo: seller.publicKey.toBase58(), extra: { feePayer: seller.publicKey.toBase58() } };
const header = (ixs) => {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = seller.publicKey; tx.recentBlockhash = "11111111111111111111111111111111";
  tx.partialSign(agent);
  return Buffer.from(JSON.stringify({ x402Version: 1, scheme: "exact", network: NETWORK, payload: { transaction: tx.serialize({ requireAllSignatures: false }).toString("base64") } })).toString("base64");
};
const pay = (amount, to = seller.publicKey) => createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, agent.publicKey), mint, getAssociatedTokenAddressSync(mint, to, true), agent.publicKey, amount, 6);

test("refuses an extra instruction that would spend the seller's SOL", async () => {
  const drain = SystemProgram.transfer({ fromPubkey: seller.publicKey, toPubkey: agent.publicKey, lamports: 1_000_000 });
  await assert.rejects(settle(header([pay(100000n), drain]), req, seller), /exactly one/);
});
test("refuses an underpayment or a payment to someone else", async () => {
  await assert.rejects(settle(header([pay(99999n)]), req, seller), /does not pay/);
  await assert.rejects(settle(header([pay(100000n, Keypair.generate().publicKey)]), req, seller), /does not pay/);
});
