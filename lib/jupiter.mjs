// Jupiter quotes, swaps and token data, ported from SAY (src/swap/jupiter.ts + tokens.ts). Mainnet only.
import { AllowError, isAddress, SOL_MINT, USDC_MINT } from "./solana.mjs";

const JUP = process.env.JUPITER_API_URL || "https://lite-api.jup.ag";
const headers = () => ({ "content-type": "application/json", ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}) });
export const DEFAULT_SLIPPAGE_BPS = 300;
export const MAX_SLIPPAGE_BPS = 3000;

// The free endpoint rate-limits hard: back off on 429 instead of failing the agent's call.
async function get(url, init = {}) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10_000), ...init });
    if (r.status !== 429 || i === 4) return r;
    await new Promise((ok) => setTimeout(ok, 600 * 2 ** i));
  }
}

async function jup(path) {
  const r = await get(`${JUP}${path}`);
  if (!r.ok) throw new AllowError(`Jupiter ${r.status}`);
  return r.json();
}

// Token names come from strangers: strip control chars, bidi overrides and markup before an LLM reads them.
const clean = (s, max) => String(s ?? "?").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩<>`]/g, "").replace(/\s+/g, " ").trim().slice(0, max) || "?";

const toToken = (t) => ({
  mint: t.id, name: clean(t.name, 40), symbol: clean(t.symbol, 16).replace(/^\$/, ""), decimals: t.decimals,
  priceUsd: t.usdPrice ?? 0, mcapUsd: t.mcap ?? 0, liquidityUsd: t.liquidity ?? 0, verified: Boolean(t.isVerified),
  freezeAuthorityDisabled: t.audit?.freezeAuthorityDisabled ?? null, mintAuthorityDisabled: t.audit?.mintAuthorityDisabled ?? null,
  topHoldersPct: t.audit?.topHoldersPercentage ?? null,
});

const ALIASES = { SOL: SOL_MINT, WSOL: SOL_MINT, USDC: USDC_MINT };

/** Ticker, name or mint → one token, or candidates when it isn't clear-cut. Never guesses. */
export async function resolveToken(query) {
  const q = String(query).trim().replace(/^\$/, "");
  const mint = ALIASES[q.toUpperCase()] ?? (isAddress(q) ? q : null);
  const list = (await jup(`/tokens/v2/search?query=${encodeURIComponent(mint ?? q)}`)).map(toToken);
  if (mint) { const t = list.find((x) => x.mint === mint); return t ? { kind: "found", token: t } : { kind: "none" }; }
  const n = (x) => x.toLowerCase();
  const exact = list.filter((t) => n(t.symbol) === n(q) || n(t.name) === n(q));
  const pool = (exact.length ? exact : list).sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  if (!pool.length) return { kind: "none" };
  if (pool.length === 1) return { kind: "found", token: pool[0] };
  const verified = pool.filter((t) => t.verified);
  if (exact.length && verified.length === 1) return { kind: "found", token: verified[0] };
  if (exact.length && pool[0].liquidityUsd > 20 * Math.max(pool[1].liquidityUsd, 1)) return { kind: "found", token: pool[0] };
  return { kind: "ambiguous", candidates: pool.slice(0, 6) };
}

export async function priceUsd(mint) {
  const r = await jup(`/price/v3?ids=${mint}`);
  const p = r[mint]?.usdPrice;
  if (!p) throw new AllowError("No live price. Nothing was done.");
  return p;
}

export async function jupQuote(inputMint, outputMint, amount, slippageBps) {
  const qs = new URLSearchParams({ inputMint, outputMint, amount: String(amount), slippageBps: String(slippageBps), swapMode: "ExactIn", restrictIntermediateTokens: "true" });
  const r = await get(`${JUP}/swap/v1/quote?${qs}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new AllowError(/route/i.test(j.error ?? j.errorCode ?? "") ? "No route for this pair right now." : `Jupiter: ${j.error ?? r.status}`);
  return j;
}

export async function jupSwapTx(quote, owner) {
  const r = await fetch(`${JUP}/swap/v1/swap`, {
    method: "POST", headers: headers(), signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      quoteResponse: quote, userPublicKey: owner, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 2_000_000, priorityLevel: "high" } },
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.swapTransaction) throw new AllowError(`Jupiter couldn't build the swap: ${j.error ?? r.status}`);
  return { tx: Buffer.from(j.swapTransaction, "base64"), lastValidBlockHeight: j.lastValidBlockHeight };
}
