// Public registry of every action the agent takes. Append-only, hash-chained, each entry signed by the agent key,
// rolled into Merkle roots that are anchored on Solana with an SPL Memo (pattern from HUSH epochs).
import { Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { CLUSTER, explorerTx } from "./config.mjs";
import { buildLevels, entryHash, leafOf, memoFor, pathFrom } from "./merkle.mjs";
import { connection, MEMO_PROGRAM } from "./solana.mjs";
import { appendLine, readJson, readLines, writeJson } from "./store.mjs";

export const entries = () => readLines("registry.jsonl");
export const anchors = () => readJson("anchors.json", []);

export async function record(agent, kind, data, usd = 0) {
  const all = entries();
  const last = all.at(-1);
  const e = { v: 1, seq: (last?.seq ?? -1) + 1, ts: new Date().toISOString(), agent: agent.address, cluster: CLUSTER, kind, usd: Math.round(usd * 1e4) / 1e4, data, prev: last?.hash ?? null };
  e.hash = await entryHash(e);
  e.sig = bs58.encode(nacl.sign.detached(Buffer.from(e.hash, "hex"), agent.keypair.secretKey));
  appendLine("registry.jsonl", e);
  return e;
}

/** Spend counted from the registry itself, so the caps and the public record can never disagree. Sells don't spend. */
export function spent(sinceMs = 0) {
  return entries().filter((e) => (e.kind === "pay" || (e.kind === "swap" && e.data.side === "buy")) && Date.parse(e.ts) >= sinceMs).reduce((a, e) => a + (e.usd || 0), 0);
}

/** Anchors every entry not yet covered by a root. Signed by the agent wallet, so the memo ties the log to it. */
export async function anchor(agent) {
  const all = entries(), done = anchors();
  const from = done.length ? done.at(-1).to + 1 : 0;
  const batch = all.filter((e) => e.seq >= from);
  if (!batch.length) return null;
  if ((await connection().getBalance(agent.keypair.publicKey)) < 10_000) throw new Error("Waiting to anchor: the memo needs about 0.00001 SOL in the agent wallet. Entries stay signed and chained meanwhile.");
  const to = batch.at(-1).seq;
  const levels = await buildLevels(await Promise.all(batch.map((e) => leafOf(e.hash))));
  const root = levels.at(-1)[0];
  const memo = memoFor(agent.address, from, to, root);
  const ix = new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [{ pubkey: agent.keypair.publicKey, isSigner: true, isWritable: false }], data: Buffer.from(memo, "utf8") });
  const signature = await sendAndConfirmTransaction(connection(), new Transaction().add(ix), [agent.keypair], { commitment: "confirmed" });
  const a = { from, to, root, memo, signature, cluster: CLUSTER, url: explorerTx(signature), at: new Date().toISOString() };
  writeJson("anchors.json", [...done, a]);
  return a;
}

export async function proofFor(seq) {
  const e = entries().find((x) => x.seq === Number(seq));
  if (!e) return null;
  const a = anchors().find((x) => e.seq >= x.from && e.seq <= x.to);
  if (!a) return { kind: "allow-proof", v: 1, entry: e, anchored: false };
  const batch = entries().filter((x) => x.seq >= a.from && x.seq <= a.to);
  const levels = await buildLevels(await Promise.all(batch.map((x) => leafOf(x.hash))));
  return { kind: "allow-proof", v: 1, anchored: true, agent: e.agent, entry: e, path: pathFrom(levels, e.seq - a.from), root: a.root, from: a.from, to: a.to, memo: a.memo, signature: a.signature, cluster: a.cluster };
}
