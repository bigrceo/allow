// Registry Merkle tree, adapted from HUSH (src/lib/merkle.ts). Runs in Node and in the browser (/verify): WebCrypto only.
//   leaf = sha256("allow-leaf-v1:" || entryHash)    node = sha256(0x01 || left || right)    odd node carries up
const enc = new TextEncoder();
export const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (h) => {
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error("expected a 32-byte hex digest");
  return Uint8Array.from({ length: 32 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16));
};
export const sha256 = async (b) => new Uint8Array(await crypto.subtle.digest("SHA-256", typeof b === "string" ? enc.encode(b) : b));
export const leafOf = async (h) => hex(await sha256("allow-leaf-v1:" + h));
export async function nodeOf(l, r) {
  const b = new Uint8Array(65); b[0] = 1; b.set(unhex(l), 1); b.set(unhex(r), 33);
  return hex(await sha256(b));
}
export async function buildLevels(leaves) {
  if (!leaves.length) throw new Error("empty tree");
  const levels = [leaves];
  while (levels.at(-1).length > 1) {
    const cur = levels.at(-1), next = [];
    for (let i = 0; i < cur.length; i += 2) next.push(i + 1 < cur.length ? await nodeOf(cur[i], cur[i + 1]) : cur[i]);
    levels.push(next);
  }
  return levels;
}
export function pathFrom(levels, index) {
  const path = [];
  let i = index;
  for (let d = 0; d < levels.length - 1; d++) {
    const s = i % 2 === 0 ? i + 1 : i - 1;
    if (s < levels[d].length) path.push({ sibling: levels[d][s], side: i % 2 === 0 ? "R" : "L" });
    i = Math.floor(i / 2);
  }
  return path;
}
export async function rootFromPath(leaf, path) {
  let h = leaf;
  for (const s of path) h = s.side === "L" ? await nodeOf(s.sibling, h) : await nodeOf(h, s.sibling);
  return h;
}

// Canonical entry hash: keys sorted, `hash` and `sig` left out. Same code on both sides.
export const canonical = (v) => Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).filter((k) => k !== "hash" && k !== "sig").sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
  : JSON.stringify(v);
export const entryHash = async (e) => hex(await sha256("allow-entry-v1:" + canonical(e)));

export const memoFor = (agent, from, to, root) => `ALLOW registry v1 ${agent} ${from}-${to} ${root}`;
export const MEMO_RE = /^ALLOW registry v1 ([1-9A-HJ-NP-Za-km-z]{32,44}) (\d+)-(\d+) ([0-9a-f]{64})$/;

/** Offline check of one entry's proof: entry → hash → leaf → root → memo text. */
export async function checkProof(p) {
  if (p?.kind !== "allow-proof" || p.v !== 1) return { ok: false, reason: "Not an Allow proof (v1)." };
  if ((await entryHash(p.entry)) !== p.entry.hash) return { ok: false, reason: "The entry was edited: its hash no longer matches." };
  const root = await rootFromPath(await leafOf(p.entry.hash), p.path);
  if (root !== p.root) return { ok: false, reason: "The Merkle path does not lead to the anchored root." };
  if (p.memo !== memoFor(p.agent, p.from, p.to, p.root)) return { ok: false, reason: "The memo text does not match this root." };
  if (p.entry.seq < p.from || p.entry.seq > p.to) return { ok: false, reason: "The entry is outside the anchored range." };
  return { ok: true, root };
}
