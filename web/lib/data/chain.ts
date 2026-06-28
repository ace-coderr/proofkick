import type { DataProvider } from "./provider";
import type { Market, SettlementReceipt } from "@/lib/types";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getReadProgram, outcomePda, CLUSTER } from "@/lib/anchor/program";
import { marketToUi, displayTeams, sideToResult, usdc } from "@/lib/anchor/map";
import type { OnchainMarket, OnchainVerifiedOutcome } from "@/lib/anchor/types";
import { base58, shorten } from "@/lib/hash";
import { TICKER } from "./fixtures";
import { teamName } from "@/lib/teams";
import { mockProvider } from "./mock";

// On-chain (Solana devnet) provider. Reads are genuine program-account decodes
// against the deployed ProofKick program; writes live in lib/anchor/actions.ts
// (they need a browser wallet). The ticker proxies the live TxLINE SSE stream
// via /api/ticker and falls back to mock when unauthenticated.
//
// Markets are keyed by their PDA base58 address (used as the route :id).
// When the deployed program has no accounts yet, every read falls back to the
// mock provider so the three core screens stay populated (the task's "keep mock
// as a fallback"). Mock market ids are "m1".."m6" (not valid pubkeys), so they
// route straight to the mock branch below.

function isPubkey(id: string): boolean {
  try {
    new PublicKey(id);
    return true;
  } catch {
    return false;
  }
}

async function fetchAllMarkets(): Promise<Market[]> {
  const program = getReadProgram();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = await (program.account as any).market.all();
  return accounts
    .map((a: { publicKey: PublicKey; account: OnchainMarket }) =>
      marketToUi(a.publicKey, a.account),
    )
    .sort((x: Market, y: Market) => {
      // Live first, then settled; biggest pools first within a group.
      const rank = (m: Market) => (m.status === "settled" ? 1 : 0);
      const d = rank(x) - rank(y);
      if (d !== 0) return d;
      return y.pools.yes + y.pools.no - (x.pools.yes + x.pools.no);
    });
}

export const chainProvider: DataProvider = {
  async listMarkets() {
    try {
      const markets = await fetchAllMarkets();
      if (markets.length) return markets;
    } catch (e) {
      console.error("[chain] listMarkets failed:", (e as Error).message);
    }
    // No on-chain markets yet → mock so the dashboard isn't empty.
    return mockProvider.listMarkets();
  },

  async getMarket(id) {
    if (isPubkey(id)) {
      try {
        const addr = new PublicKey(id);
        const program = getReadProgram();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const acct = (await (program.account as any).market.fetch(addr)) as OnchainMarket;
        return marketToUi(addr, acct);
      } catch (e) {
        console.error("[chain] getMarket failed:", (e as Error).message);
        return null;
      }
    }
    return mockProvider.getMarket(id);
  },

  async getReceipt(marketId) {
    if (isPubkey(marketId)) {
      try {
        return await buildReceipt(marketId);
      } catch (e) {
        console.error("[chain] getReceipt failed:", (e as Error).message);
        return null;
      }
    }
    return mockProvider.getReceipt(marketId);
  },

  async getTicker() {
    // SSR initial paint uses the mock list; the client Ticker swaps in the live
    // SSE-backed scores from /api/ticker once mounted.
    return TICKER;
  },

  async getPortfolioSummary() {
    // The connected wallet is only known client-side; the NavBar/Portfolio page
    // read it from the wallet adapter. This is the SSR placeholder.
    return { balanceUsdc: 0, wallet: "Connect wallet" };
  },
};

// Build a settlement receipt from the on-chain market + VerifiedOutcome.
//
// The market totals, winning side, settlement tx/slot/time and the verified
// predicate are all real on-chain data. The Merkle tree *visualisation* is
// reconstructed deterministically from the market address — the proof itself is
// validated inside verify_outcome's CPI and not retained in account state, so
// the tree shown here is illustrative (noted in the README summary).
async function buildReceipt(marketId: string): Promise<SettlementReceipt | null> {
  const connection = getConnection();
  const program = getReadProgram(connection);
  const addr = new PublicKey(marketId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const market = (await (program.account as any).market.fetch(addr)) as OnchainMarket;
  const ui = marketToUi(addr, market);

  const outAddr = outcomePda(addr);
  let outcome: OnchainVerifiedOutcome | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outcome = (await (program.account as any).verifiedOutcome.fetch(outAddr)) as OnchainVerifiedOutcome;
  } catch {
    outcome = null;
  }

  const fixtureId = Number(market.fixtureId.toString());
  const { home, away } = displayTeams(marketId);
  const winning = sideToResult(market.winningSide) ?? (outcome?.predicateHeld ? "YES" : "NO");

  // Real settlement tx: the most recent signature touching the outcome PDA.
  let txSignature = base58(marketId + ":tx", 88);
  let slot = 0;
  let settledAt = "—";
  try {
    const sigs = await connection.getSignaturesForAddress(outAddr, { limit: 1 });
    if (sigs[0]) {
      txSignature = sigs[0].signature;
      slot = sigs[0].slot;
      if (sigs[0].blockTime) {
        settledAt =
          new Date(sigs[0].blockTime * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
      }
    }
  } catch {
    /* leave synthesized fallbacks */
  }
  if (settledAt === "—" && outcome) {
    settledAt =
      new Date(Number(outcome.ts.toString()) * 1000).toISOString().replace("T", " ").slice(0, 19) +
      " UTC";
  }

  const root = base58(marketId + ":root", 44);
  const parts = ui.predicate.line.split(" ");
  const statNoun = parts.slice(2).join(" ");
  const cmpOp = ui.predicate.line.startsWith("Under")
    ? "<"
    : ui.predicate.line.startsWith("Exactly")
      ? "="
      : ">";

  return {
    id: `rcpt_${marketId.slice(0, 8)}`,
    marketId,
    receiptNo: `PK-${shorten(marketId, 6, 4)}`,
    title: {
      main: statNoun.charAt(0).toUpperCase() + statNoun.slice(1),
      op: `${cmpOp} ${market.threshold}`,
      outcome: `${winning} wins`,
    },
    outcome: winning,
    verifiedStat: outcome
      ? `predicate ${outcome.predicateHeld ? "held" : "failed"}`
      : "awaiting verification",
    predicateLineLabel: parts.slice(0, 2).join(" "),
    lineValue: String(market.threshold),
    fixture: {
      home: teamName(home),
      away: teamName(away),
      score: ui.score ? `${ui.score[0]} – ${ui.score[1]}` : "FT",
    },
    merkle: {
      root,
      rootShort: shorten(root),
      proofLeaf: base58(marketId + ":proof", 44),
      nodes: [
        { label: "H(0,1)", hash: base58(marketId + ":n01", 8) },
        { label: "H(2,3)", hash: base58(marketId + ":n23", 8) },
      ],
      leaves: [
        { tag: "STAT_LEAF", sub: `key ${market.statAKey}`, hash: base58(marketId + ":l0", 8) },
        { tag: "FIXTURE_ROOT", sub: `#${fixtureId}`, hash: base58(marketId + ":l1", 8) },
        { tag: "MAIN_ROOT", sub: "daily", hash: base58(marketId + ":l2", 8) },
        { tag: "FINAL_STATE", sub: "verified", hash: base58(marketId + ":l3", 8) },
      ],
    },
    solana: {
      txSignature,
      slot,
      settledAt,
      cluster: CLUSTER,
    },
    pool: { amount: usdc(market.totalYes) + usdc(market.totalNo), side: winning },
  };
}
