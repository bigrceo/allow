// Local state under ~/.allot: agent key, policy (the allotment), registry, anchors. Plain files, owner-only.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./config.mjs";

const p = (f) => join(HOME, f);
export const ensureHome = () => { if (!existsSync(HOME)) mkdirSync(HOME, { recursive: true, mode: 0o700 }); };
export function readJson(f, fallback = null) {
  try { return JSON.parse(readFileSync(p(f), "utf8")); } catch { return fallback; }
}
export function writeJson(f, v, mode = 0o600) {
  ensureHome();
  writeFileSync(p(f), JSON.stringify(v, null, 2), { mode });
  chmodSync(p(f), mode);
}
export function readLines(f) {
  try { return readFileSync(p(f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
}
export function appendLine(f, v) { ensureHome(); appendFileSync(p(f), JSON.stringify(v) + "\n", { mode: 0o600 }); }
