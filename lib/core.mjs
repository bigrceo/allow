// The six things an agent can do with Allot. MCP, CLI and the HTTP API are thin layers over these.
import { randomBytes } from "node:crypto";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { CLUSTER, explorerTx, LIVE_TRADING } from "./config.mjs";
import { DEFAULT_SLIPPAGE_BPS, jupQuote, jupSwapTx, priceUsd, resolveToken } from "./jupiter.mjs";
import { anchor, anchors, entries, record, spent } from "./registry.mjs";
import { AllotError, isAddress, LAMPORTS, mainnet, sendSigned, SOL_MINT, USDC_MINT } from "./solana.mjs";
import { readJson, writeJson } from "./store.mjs";
import { getPolicy, loadAgent, solBalance } from "./wallet.mjs";
import { buildPayment, decodeReceipt, pickRequirement, usdcBalance, usdcMint } from "./x402.mjs";

const QUOTE_MINT = { SOL: SOL_MINT, USDC: USDC_MINT };
const QUOTE_DEC = { SOL: 9, USDC: 6 };
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

function agentOrThrow() {
  const a = loadAgent();
  if (!a) throw new AllotError("No agent wallet yet. The owner runs `npx allot-kit init` first.");
  return a;
}

/** Every write goes through here. The registry is the ledger, so caps can't drift from the public record. */
export function guard(usd) {
  const p = getPolicy();
  if (p.revoked) throw new AllotError("This allotment was revoked by its owner. Nothing was done.");
  if (p.expiresAt && Date.now() > Date.parse(p.expiresAt)) throw new AllotError("This allotment has expired. Nothing was done.");
  if (usd > p.perTxUsd) throw new AllotError(`$${round(usd, 2)} is over the per-action cap of $${p.perTxUsd}. Nothing was done.`);
  const day = spent(Date.now() - 864e5), total = spent(0);
  if (day + usd > p.dailyUsd) throw new AllotError(`That would pass the 24 h cap ($${round(day, 2)} of $${p.dailyUsd} used). Nothing was done.`);
  if (total + usd > p.totalUsd) throw new AllotError(`That would pass the total allotment ($${round(total, 2)} of $${p.totalUsd} used). Nothing was done.`);
  return p;
}

async function anchorQuietly(agent) {
  try { return await anchor(agent); } catch (e) { return { pending: true, reason: String(e.message).slice(0, 160) }; }
}

export async function wallet() {
  const a = agentOrThrow();
  const [sol, usdc] = await Promise.all([solBalance(a.address).catch(() => null), usdcBalance(a.address)]);
  const paper = readJson("paper.json", {});
  return {
    address: a.address, cluster: CLUSTER, sol, usdc, trading: LIVE_TRADING ? "live (mainnet)" : "simulated at live Jupiter prices",
    paperHoldings: LIVE_TRADING ? undefined : Object.values(paper).filter((h) => h.amount > 0),
    revoked: getPolicy().revoked,
  };
}

export async function budget() {
  agentOrThrow();
  const p = getPolicy(), day = spent(Date.now() - 864e5), total = spent(0);
  return {
    perActionUsd: p.perTxUsd, dailyUsd: p.dailyUsd, totalUsd: p.totalUsd,
    usedTodayUsd: round(day, 2), usedTotalUsd: round(total, 2),
    leftTodayUsd: round(Math.max(0, Math.min(p.dailyUsd - day, p.totalUsd - total)), 2),
    maxSlippagePct: p.maxSlippageBps / 100, payHosts: p.payHosts, tokens: p.tokens, expiresAt: p.expiresAt, revoked: p.revoked,
  };
}

const usdOf = async (asset, raw) => asset === "SOL" ? (Number(raw) / LAMPORTS) * (await priceUsd(SOL_MINT)) : asset === usdcMint() ? Number(raw) / 1e6 : null;

/** Fetches a URL. If it answers 402, pays it from the allotment (host allowlist + caps) and fetches again. */
export async function pay({ url, method = "GET", body, maxUsd }) {
  const a = agentOrThrow();
  const u = new URL(url);
  const p = getPolicy();
  if (!p.payHosts.includes(u.hostname.toLowerCase())) throw new AllotError(`${u.hostname} is not on this agent's pay list. The owner can add it with \`allot policy payHosts\`.`);
  const init = { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) };
  const first = await fetch(url, init);
  if (first.status !== 402) return { paid: false, status: first.status, body: await first.text().then((t) => t.slice(0, 4000)) };
  const req = await pickRequirement(await first.json(), a.address);
  const usd = await usdOf(req.asset, req.maxAmountRequired);
  if (usd == null) throw new AllotError(`Can't price asset ${req.asset} in USD, so the caps can't be checked. Nothing was paid.`);
  if (maxUsd != null && usd > maxUsd) throw new AllotError(`Asks $${round(usd, 4)}, over your maxUsd of $${maxUsd}. Nothing was paid.`);
  guard(usd);
  const header = await buildPayment(req, a.keypair);
  const second = await fetch(url, { ...init, headers: { ...init.headers, "X-PAYMENT": header } });
  const receipt = decodeReceipt(second.headers.get("x-payment-response"));
  if (!second.ok || !receipt?.transaction) throw new AllotError(`The seller refused the payment (${second.status}): ${(await second.text()).slice(0, 200)}`);
  const e = await record(a, "pay", { url: u.origin + u.pathname, mint: req.asset, amount: req.maxAmountRequired, payTo: req.payTo, asset: req.asset === "SOL" ? "SOL" : "USDC", feePaidBy: req.extra?.feePayer ? "seller" : "agent", signature: receipt.transaction, description: String(req.description ?? "").slice(0, 120) }, usd);
  const anchored = await anchorQuietly(a);
  return { paid: true, usd: round(usd, 4), signature: receipt.transaction, explorer: explorerTx(receipt.transaction), registrySeq: e.seq, anchored, body: (await second.text()).slice(0, 4000) };
}

/** Prices a trade on Jupiter (mainnet liquidity). Nothing moves. Returns a quoteId valid 60 s for `swap`. */
export async function quote({ side, token, amount, quote: q = "SOL", slippageBps }) {
  agentOrThrow();
  if (!["buy", "sell"].includes(side)) throw new AllotError("side is buy or sell.");
  if (!QUOTE_MINT[q]) throw new AllotError("quote is SOL or USDC.");
  const p = getPolicy();
  const r = await resolveToken(token);
  if (r.kind === "none") throw new AllotError(`No Solana token found for "${token}".`);
  if (r.kind === "ambiguous") return { ambiguous: true, message: "Several tokens match. Ask again with the mint.", candidates: r.candidates.map((t) => ({ symbol: t.symbol, name: t.name, mint: t.mint, liquidityUsd: Math.round(t.liquidityUsd), verified: t.verified })) };
  const t = r.token;
  if (p.tokens !== "any" && !p.tokens.includes(t.mint)) throw new AllotError(`$${t.symbol} is not on this agent's token list.`);
  if (t.freezeAuthorityDisabled === false && t.mint !== USDC_MINT) throw new AllotError(`$${t.symbol} still has a freeze authority: its creator can freeze holders. Refused.`);
  const bps = Math.max(10, Math.min(p.maxSlippageBps, Math.round(slippageBps ?? DEFAULT_SLIPPAGE_BPS)));
  const [inMint, outMint] = side === "buy" ? [QUOTE_MINT[q], t.mint] : [t.mint, QUOTE_MINT[q]];
  const inDec = side === "buy" ? QUOTE_DEC[q] : t.decimals, outDec = side === "buy" ? t.decimals : QUOTE_DEC[q];
  const n = Number(amount);
  if (!(n > 0)) throw new AllotError("amount must be above zero.");
  const raw = BigInt(Math.round(n * 10 ** Math.min(inDec, 9))) * 10n ** BigInt(Math.max(0, inDec - 9));
  const jq = await jupQuote(inMint, outMint, raw, bps);
  const qPrice = q === "SOL" ? await priceUsd(SOL_MINT) : 1;
  const quoteSide = side === "buy" ? Number(jq.inAmount) / 10 ** inDec : Number(jq.outAmount) / 10 ** outDec;
  const usd = quoteSide * qPrice;
  const warnings = [];
  if (t.liquidityUsd < 10_000) warnings.push(`Thin liquidity: $${Math.round(t.liquidityUsd)}.`);
  if (t.mintAuthorityDisabled === false) warnings.push("Mint authority is on: supply can grow.");
  if ((t.topHoldersPct ?? 0) > 50) warnings.push(`Top 10 holders own ${round(t.topHoldersPct, 1)}%.`);
  const id = randomBytes(6).toString("hex");
  const plan = { id, side, token: { mint: t.mint, symbol: t.symbol, decimals: t.decimals }, quote: q, inMint, outMint, inAmount: jq.inAmount, outAmount: jq.outAmount, minOut: jq.otherAmountThreshold, inDec, outDec, slippageBps: bps, usd, expires: Date.now() + 60_000, route: [...new Set(jq.routePlan.map((x) => x.swapInfo.label))] };
  writeJson("quotes.json", { ...pruneQuotes(), [id]: plan });
  return {
    quoteId: id, side, token: `$${t.symbol}`, mint: t.mint,
    youPay: `${round(Number(jq.inAmount) / 10 ** inDec, 6)} ${side === "buy" ? q : "$" + t.symbol}`,
    youGet: `${round(Number(jq.outAmount) / 10 ** outDec, 6)} ${side === "buy" ? "$" + t.symbol : q}`,
    atLeast: `${round(Number(jq.otherAmountThreshold) / 10 ** outDec, 6)}`, usd: round(usd, 2),
    priceImpactPct: round(Math.abs(Number(jq.priceImpactPct) * 100), 3), slippagePct: bps / 100, route: plan.route, warnings,
    mode: LIVE_TRADING ? "live" : "simulated", expiresInSec: 60,
  };
}

function pruneQuotes() {
  return Object.fromEntries(Object.entries(readJson("quotes.json", {})).filter(([, v]) => v.expires > Date.now()));
}

/** Executes a quote. Re-quotes first and aborts if the new price is under the floor that was shown. */
export async function swap({ quoteId }) {
  const a = agentOrThrow();
  const quotes = pruneQuotes();
  const plan = quotes[quoteId];
  if (!plan) throw new AllotError("Unknown or expired quote (60 s). Ask for a new quote.");
  delete quotes[quoteId];
  writeJson("quotes.json", quotes); // single use
  guard(plan.side === "buy" ? plan.usd : 0); // a sell still needs an active, unexpired allotment
  const fresh = await jupQuote(plan.inMint, plan.outMint, BigInt(plan.inAmount), plan.slippageBps);
  if (BigInt(fresh.outAmount) < BigInt(plan.minOut)) throw new AllotError("The price moved past the slippage since the quote. Nothing was sent.");
  if (BigInt(fresh.otherAmountThreshold) < BigInt(plan.minOut)) fresh.otherAmountThreshold = plan.minOut; // never below what was approved
  let signature = null, received = BigInt(fresh.outAmount);
  const paper = readJson("paper.json", {});
  if (LIVE_TRADING) {
    const built = await jupSwapTx(fresh, a.address);
    const tx = VersionedTransaction.deserialize(built.tx);
    tx.sign([a.keypair]);
    signature = await sendSigned(mainnet(), tx.serialize(), built.lastValidBlockHeight);
  } else if (plan.side === "sell") {
    const have = paper[plan.token.mint]?.raw ?? "0";
    if (BigInt(have) < BigInt(plan.inAmount)) throw new AllotError(`Simulated wallet holds ${Number(have) / 10 ** plan.token.decimals} $${plan.token.symbol}, not enough to sell. Nothing was done.`);
  }
  if (!LIVE_TRADING) {
    const h = paper[plan.token.mint] ?? { mint: plan.token.mint, symbol: plan.token.symbol, decimals: plan.token.decimals, raw: "0" };
    h.raw = (BigInt(h.raw) + (plan.side === "buy" ? received : -BigInt(plan.inAmount))).toString();
    h.amount = Number(h.raw) / 10 ** h.decimals;
    writeJson("paper.json", { ...paper, [plan.token.mint]: h });
  }
  const e = await record(a, "swap", {
    mode: LIVE_TRADING ? "live" : "simulated", side: plan.side, token: plan.token.symbol, mint: plan.token.mint, quote: plan.quote,
    in: plan.inAmount, out: received.toString(), inDecimals: plan.inDec, outDecimals: plan.outDec, minOut: plan.minOut, route: plan.route, signature,
  }, plan.usd);
  const anchored = await anchorQuietly(a);
  return {
    done: true, mode: LIVE_TRADING ? "live" : "simulated (no funds moved; filled at the fresh Jupiter quote)",
    spent: `${round(Number(plan.inAmount) / 10 ** plan.inDec, 6)} ${plan.side === "buy" ? plan.quote : "$" + plan.token.symbol}`,
    received: `${round(Number(received) / 10 ** plan.outDec, 6)} ${plan.side === "buy" ? "$" + plan.token.symbol : plan.quote}`,
    usd: round(plan.usd, 2), signature, registrySeq: e.seq, anchored,
  };
}

export async function history({ limit = 20 } = {}) {
  const all = entries();
  return { count: all.length, entries: all.slice(-limit).reverse().map(({ sig, prev, ...e }) => e), anchors: anchors().slice(-5).reverse() };
}

export { isAddress, PublicKey };

/** The $ALLOT mint, read from mainnet: supply, largest holders, price. Empty until the CA is set in brand.mjs. */
export async function token() {
  const { BRAND } = await import("../brand.mjs");
  if (!BRAND.ca) return { ticker: `$${BRAND.ticker}`, ca: null, message: `The contract address drops at launch, on ${BRAND.domain} and x.com/${BRAND.x} only.` };
  const mint = new PublicKey(BRAND.ca), c = mainnet();
  const [supply, largest, price] = await Promise.all([c.getTokenSupply(mint), c.getTokenLargestAccounts(mint).catch(() => null), priceUsd(BRAND.ca).catch(() => null)]);
  const total = Number(supply.value.uiAmount);
  if (!largest) return { ticker: `$${BRAND.ticker}`, ca: BRAND.ca, supply: total, priceUsd: price, mcapUsd: price ? round(price * total, 0) : null, holders: "The public RPC refused the holder scan. Set HELIUS_RPC_URL." };
  const top = largest.value.slice(0, 10).map((a) => ({ account: a.address.toBase58(), amount: a.uiAmount, pct: round((a.uiAmount / total) * 100, 2) }));
  return { ticker: `$${BRAND.ticker}`, ca: BRAND.ca, supply: total, priceUsd: price, mcapUsd: price ? round(price * total, 0) : null, top10Pct: round(top.reduce((s, a) => s + a.pct, 0), 2), top, note: "Top accounts include the pump.fun curve or pool." };
}
