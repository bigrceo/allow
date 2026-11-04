import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLevels, checkProof, entryHash, leafOf, memoFor, pathFrom } from "../lib/merkle.mjs";

test("a proof checks, and any edit breaks it", async () => {
  const es = [];
  for (let i = 0; i < 5; i++) { const e = { v: 1, seq: i, kind: "pay", usd: i, data: { n: i } }; e.hash = await entryHash(e); es.push(e); }
  const levels = await buildLevels(await Promise.all(es.map((e) => leafOf(e.hash))));
  const root = levels.at(-1)[0], agent = "11111111111111111111111111111111";
  const proof = (e, i) => ({ kind: "allot-proof", v: 1, agent, entry: e, path: pathFrom(levels, i), root, from: 0, to: 4, memo: memoFor(agent, 0, 4, root) });
  for (let i = 0; i < 5; i++) assert.equal((await checkProof(proof(es[i], i))).ok, true);
  assert.equal((await checkProof(proof({ ...es[2], usd: 999 }, 2))).ok, false);
});
