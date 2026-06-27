// Translate decoded on-chain accounts into the UI domain types (lib/types.ts).
//
// The program stores a numeric predicate (stat key + comparison + threshold) and
// a fixture id — not human strings — so this module renders those into the
// labels/teams the UI expects. Anything the chain does not record (team names,
// venue, live minute) is derived best-effort from the fixture id.
import type { Market, MarketStatus } from "@/lib/types";
import { PublicKey } from "@solana/web3.js";
import type {
  ComparisonEnum,
  MarketStatusEnum,
  OnchainMarket,
  SideEnum,
} from "./types";
import { CLUSTER, TXORACLE_PROGRAM_ID } from "./program";

const USDC_DECIMALS = 6;

// TxLINE stat keys → human label. 1002 = total goals is the documented example;
// the rest are plausible mappings for the demo predicate set.
const STAT_LABELS: Record<number, { noun: string; cat: string }> = {
  1001: { noun: "home goals", cat: "Goals" },
  1002: { noun: "total goals", cat: "Goals" },
  1003: { noun: "away goals", cat: "Goals" },
  1010: { noun: "total corners", cat: "Corners" },
  1020: { noun: "total cards", cat: "Cards" },
};

function statInfo(key: number) {
  return STAT_LABELS[key] ?? { noun: `stat ${key}`, cat: "Stat" };
}

function enumKey<T extends object>(e: T | null | undefined): string | null {
  if (!e) return null;
  const k = Object.keys(e)[0];
  return k ?? null;
}

export function statusToUi(s: MarketStatusEnum): MarketStatus {
  const k = enumKey(s);
  if (k === "settled") return "settled";
  // The program has no "upcoming" — Open/Verified markets are shown as live.
  return "live";
}

export function comparisonWord(c: ComparisonEnum): { word: string; op: string } {
  switch (enumKey(c)) {
    case "lessThan":
      return { word: "Under", op: "<" };
    case "equalTo":
      return { word: "Exactly", op: "=" };
    default:
      return { word: "Over", op: ">" };
  }
}

export function sideToResult(s: SideEnum | null): "YES" | "NO" | undefined {
  const k = enumKey(s);
  if (k === "yes") return "YES";
  if (k === "no") return "NO";
  return undefined;
}

function toNum(v: { toNumber?: () => number } | number): number {
  return typeof v === "number" ? v : (v.toNumber?.() ?? Number(v));
}

export function usdc(n: { toString: () => string } | number): number {
  const raw = typeof n === "number" ? n : Number(n.toString());
  return raw / 10 ** USDC_DECIMALS;
}

// Deterministic team pairing from a fixture id, so the same market always shows
// the same fixture. Real team names would come from a fixtures registry / the
// TxLINE fixtures endpoint; here we map onto the World Cup demo set.
const DEMO_TEAMS = [
  "BRA", "ARG", "FRA", "ESP", "ENG", "GER", "POR", "NED", "MEX", "USA", "ITA", "BEL", "CRO", "URU",
];

export function fixtureTeams(fixtureId: number): { home: string; away: string } {
  const n = Math.abs(fixtureId);
  const h = n % DEMO_TEAMS.length;
  let a = (Math.floor(n / DEMO_TEAMS.length) + 1) % DEMO_TEAMS.length;
  if (a === h) a = (a + 1) % DEMO_TEAMS.length;
  return { home: DEMO_TEAMS[h], away: DEMO_TEAMS[a] };
}

export function marketToUi(addr: PublicKey, m: OnchainMarket): Market {
  const id = addr.toBase58();
  const fixtureId = toNum(m.fixtureId);
  const { home, away } = fixtureTeams(fixtureId);
  const a = statInfo(m.statAKey);
  const cmp = comparisonWord(m.comparison);

  // Build the predicate prose, supporting the optional two-stat form.
  let statPhrase = a.noun;
  if (m.statBKey != null) {
    const b = statInfo(m.statBKey);
    const opWord = enumKey(m.op) === "subtract" ? "minus" : "plus";
    statPhrase = `${a.noun} ${opWord} ${b.noun}`;
  }
  const line = `${cmp.word} ${m.threshold} ${statPhrase}`;

  const yes = usdc(m.totalYes);
  const no = usdc(m.totalNo);
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const status = statusToUi(m.status);

  return {
    id,
    home,
    away,
    status,
    comp: "World Cup 2026",
    venue: `Fixture #${fixtureId}`,
    predicate: {
      label: `Predicate · ${a.cat}`,
      line,
      plain: `${statPhrase[0].toUpperCase()}${statPhrase.slice(1)} in ${home} vs ${away} will be ${cmp.word.toLowerCase()} ${m.threshold}.`,
    },
    score: null,
    yesPct,
    pools: { yes, no },
    settlesIn: status === "live" ? "on proof" : undefined,
    result: status === "settled" ? sideToResult(m.winningSide) : undefined,
    resolvedAgo: status === "settled" ? "settled" : undefined,
    chain: {
      marketAccount: id,
      oracleProgram: TXORACLE_PROGRAM_ID.toBase58(),
      settlementMint: m.usdcMint.toBase58(),
      resolutionSource: "TxLINE Merkle proof → validate_stat CPI",
    },
  };
}

export { CLUSTER };
