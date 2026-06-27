import type { Market, SettlementReceipt, TickerMatch } from "@/lib/types";
import { base58, shorten } from "@/lib/hash";

// ── Shared on-chain-ish constants ──────────────────────────────────────────────
// USDC SPL mint (mainnet address shown for realism; the chain provider would use
// the devnet mint when NEXT_PUBLIC_SOLANA_CLUSTER=devnet).
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TXLINE_PROGRAM = "TxLNoRACLE9kQpR3mZxWvP6sJ2hYbE4gUq8nDfHkB6oZ";

function chainMeta(seed: string) {
  return {
    marketAccount: base58(seed + ":mkt", 44),
    oracleProgram: TXLINE_PROGRAM,
    settlementMint: USDC_MINT,
    resolutionSource: "FIFA official feed → Merkle",
  };
}

// ── Markets ────────────────────────────────────────────────────────────────────
export const MARKETS: Market[] = [
  {
    id: "m1",
    home: "BRA",
    away: "ARG",
    status: "live",
    minute: 67,
    score: [2, 1],
    predicate: {
      label: "Predicate · Goals",
      line: "Over 2.5 total goals",
      plain: "Total goals scored in Brazil vs Argentina will be over 2.5.",
    },
    yesPct: 64,
    pools: { yes: 128400, no: 72250 },
    settlesIn: "~23 min",
    venue: "MetLife Stadium",
    comp: "Quarter-final",
    chain: chainMeta("m1"),
  },
  {
    id: "m2",
    home: "BRA",
    away: "ARG",
    status: "live",
    minute: 67,
    score: [2, 1],
    predicate: {
      label: "Predicate · Corners",
      line: "Over 10 total corners",
      plain: "Total corners in Brazil vs Argentina will be over 10.",
    },
    yesPct: 41,
    pools: { yes: 54300, no: 78100 },
    settlesIn: "~23 min",
    venue: "MetLife Stadium",
    comp: "Quarter-final",
    chain: chainMeta("m2"),
  },
  {
    id: "m3",
    home: "FRA",
    away: "ESP",
    status: "upcoming",
    score: null,
    kickoffTime: "20:00",
    kickoffDay: "Today",
    predicate: {
      label: "Predicate · Goals",
      line: "Both teams to score",
      plain: "Both France and Spain will each score at least one goal.",
    },
    yesPct: 73,
    pools: { yes: 88200, no: 32600 },
    venue: "SoFi Stadium",
    comp: "Quarter-final",
    chain: chainMeta("m3"),
  },
  {
    id: "m4",
    home: "ENG",
    away: "GER",
    status: "live",
    minute: 34,
    score: [1, 0],
    predicate: {
      label: "Predicate · Goals",
      line: "Over 1.5 total goals",
      plain: "Total goals in England vs Germany will be over 1.5.",
    },
    yesPct: 69,
    pools: { yes: 101200, no: 45800 },
    settlesIn: "~56 min",
    venue: "AT&T Stadium",
    comp: "Quarter-final",
    chain: chainMeta("m4"),
  },
  {
    id: "m5",
    home: "POR",
    away: "NED",
    status: "settled",
    score: [2, 1],
    result: "YES",
    resolvedAgo: "14 min ago",
    predicate: {
      label: "Predicate · Cards",
      line: "Over 4.5 total cards",
      plain: "Total cards shown in Portugal vs Netherlands will be over 4.5.",
    },
    yesPct: 58,
    pools: { yes: 64200, no: 46900 },
    venue: "Estadio Azteca",
    comp: "Round of 16",
    chain: chainMeta("m5"),
  },
  {
    id: "m6",
    home: "FRA",
    away: "POR",
    status: "settled",
    score: [3, 1],
    result: "YES",
    resolvedAgo: "just now",
    predicate: {
      label: "Predicate · Goals",
      line: "Over 2.5 total goals",
      plain: "Total goals in France vs Portugal will be over 2.5.",
    },
    yesPct: 61,
    pools: { yes: 96400, no: 58200 },
    venue: "Mercedes-Benz Stadium",
    comp: "Round of 16",
    chain: chainMeta("m6"),
  },
];

// ── Ticker ─────────────────────────────────────────────────────────────────────
export const TICKER: TickerMatch[] = [
  { home: "BRA", score: "2 - 1", away: "ARG", min: "67'" },
  { home: "ENG", score: "1 - 0", away: "GER", min: "34'" },
  { home: "POR", score: "2 - 1", away: "NED", min: "FT" },
  { home: "MEX", score: "0 - 0", away: "USA", min: "12'" },
  { home: "ITA", score: "1 - 1", away: "BEL", min: "78'" },
  { home: "FRA", score: "— · —", away: "ESP", min: "20:00" },
  { home: "CRO", score: "2 - 0", away: "URU", min: "FT" },
];

// ── Receipts ───────────────────────────────────────────────────────────────────
// The hero receipt (m1) uses the exact values from the approved design so it
// renders pixel-for-pixel. Other settled markets get a generated-but-plausible
// receipt via `buildReceipt`, demonstrating how the data layer would mint these
// from on-chain settlement data.

const HERO_RECEIPT: SettlementReceipt = {
  id: "rcpt_m1",
  marketId: "m1",
  receiptNo: "PK-2026-00428",
  title: { main: "Total goals", op: "> 2.5", outcome: "YES wins" },
  outcome: "YES",
  verifiedStat: "3 goals",
  predicateLineLabel: "Over 2.5",
  lineValue: "2.5",
  fixture: { home: "Brazil", away: "Argentina", score: "2 – 1" },
  merkle: {
    root: "9fXkQ2mWpR7vJ3nDfHsB4tZcYbE2gUq1PsX8nLpAoZr",
    rootShort: "9fXk…AoZr",
    proofLeaf: "A37jPqK9dWmXz2vYbE4gUq7PsNfHkB6oZrVtCyA8eS3u",
    nodes: [
      { label: "H(0,1)", hash: "Hn4dKpQ2" },
      { label: "H(2,3)", hash: "tZ7bVmR3" },
    ],
    leaves: [
      { tag: "GOAL_EVENT", sub: "BRA · 23'", hash: "aF9cQ2dK" },
      { tag: "GOAL_EVENT", sub: "ARG · 58'", hash: "7eB4mP8x" },
      { tag: "GOAL_EVENT", sub: "BRA · 81'", hash: "c9D5aR3e" },
      { tag: "FINAL_STATE", sub: "90+4 · FT", hash: "bF8eN2pK" },
    ],
  },
  solana: {
    txSignature:
      "4vC8s2bQ7mWdFa9vJxTzL7cYbE2gUq4PsX1nDfHkM6oZrVtBwCyA8eS3uJ2pN7iKqRtY9mzKdGfHvWxa3Pb",
    slot: 301482119,
    settledAt: "2026-06-26 19:42:08 UTC",
    cluster: "devnet",
  },
  pool: { amount: 200650, side: "YES" },
};

interface BuildReceiptInput {
  market: Market;
  receiptNo: string;
  title: { main: string; op: string; outcome: string };
  verifiedStat: string;
  predicateLineLabel: string;
  lineValue: string;
  fixtureScore: string;
  leaves: { tag: string; sub: string }[];
  slot: number;
  settledAt: string;
  poolAmount: number;
}

function buildReceipt(i: BuildReceiptInput): SettlementReceipt {
  const seed = i.market.id;
  const root = base58(seed + ":root", 44);
  return {
    id: `rcpt_${i.market.id}`,
    marketId: i.market.id,
    receiptNo: i.receiptNo,
    title: i.title,
    outcome: "YES",
    verifiedStat: i.verifiedStat,
    predicateLineLabel: i.predicateLineLabel,
    lineValue: i.lineValue,
    fixture: {
      home: teamFull(i.market.home),
      away: teamFull(i.market.away),
      score: i.fixtureScore,
    },
    merkle: {
      root,
      rootShort: shorten(root),
      proofLeaf: base58(seed + ":proof", 44),
      nodes: [
        { label: "H(0,1)", hash: base58(seed + ":n01", 8) },
        { label: "H(2,3)", hash: base58(seed + ":n23", 8) },
      ],
      leaves: i.leaves.map((l, idx) => ({
        ...l,
        hash: base58(`${seed}:leaf:${idx}`, 8),
      })),
    },
    solana: {
      txSignature: base58(seed + ":tx", 88),
      slot: i.slot,
      settledAt: i.settledAt,
      cluster: "devnet",
    },
    pool: { amount: i.poolAmount, side: "YES" },
  };
}

// Local copy to avoid importing the UI teams map into the data layer cycle.
const FULL: Record<string, string> = {
  BRA: "Brazil",
  ARG: "Argentina",
  FRA: "France",
  ESP: "Spain",
  POR: "Portugal",
  NED: "Netherlands",
};
const teamFull = (c: string) => FULL[c] ?? c;

const RECEIPTS: Record<string, SettlementReceipt> = {
  m1: HERO_RECEIPT,
  m5: buildReceipt({
    market: MARKETS.find((m) => m.id === "m5")!,
    receiptNo: "PK-2026-00417",
    title: { main: "Total cards", op: "> 4.5", outcome: "YES wins" },
    verifiedStat: "6 cards",
    predicateLineLabel: "Over 4.5",
    lineValue: "4.5",
    fixtureScore: "2 – 1",
    leaves: [
      { tag: "CARD_EVENT", sub: "NED · 31'" },
      { tag: "CARD_EVENT", sub: "POR · 49'" },
      { tag: "CARD_EVENT", sub: "NED · 77'" },
      { tag: "FINAL_STATE", sub: "90+2 · FT" },
    ],
    slot: 301455902,
    settledAt: "2026-06-26 18:08:42 UTC",
    poolAmount: 111100,
  }),
  m6: buildReceipt({
    market: MARKETS.find((m) => m.id === "m6")!,
    receiptNo: "PK-2026-00426",
    title: { main: "Total goals", op: "> 2.5", outcome: "YES wins" },
    verifiedStat: "4 goals",
    predicateLineLabel: "Over 2.5",
    lineValue: "2.5",
    fixtureScore: "3 – 1",
    leaves: [
      { tag: "GOAL_EVENT", sub: "FRA · 14'" },
      { tag: "GOAL_EVENT", sub: "POR · 39'" },
      { tag: "GOAL_EVENT", sub: "FRA · 62'" },
      { tag: "FINAL_STATE", sub: "90+3 · FT" },
    ],
    slot: 301478233,
    settledAt: "2026-06-26 19:55:13 UTC",
    poolAmount: 154600,
  }),
};

/** Receipt for a market id; falls back to the hero receipt for markets that
 *  don't (yet) have their own settlement. */
export function receiptForMarket(marketId: string): SettlementReceipt {
  return RECEIPTS[marketId] ?? HERO_RECEIPT;
}
