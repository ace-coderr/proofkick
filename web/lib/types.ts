// Domain types for ProofKick.
//
// These types are the contract between the UI and the data layer. They are
// deliberately framed around what a *settled-on-Solana* prediction market looks
// like — pools in USDC base units (here we use whole USDC for readability),
// market/oracle account addresses, and a Merkle inclusion proof — so that the
// mock provider and a future on-chain provider can satisfy the exact same shape.

export type TeamCode = string;

export type MarketStatus = "live" | "upcoming" | "settled";

export interface Predicate {
  /** Short category label, e.g. "Predicate · Goals". */
  label: string;
  /** One-line market headline, e.g. "Over 2.5 total goals". */
  line: string;
  /** Full plain-language predicate sentence. */
  plain: string;
}

/** On-chain coordinates for a market. In the mock these are plausible base58
 *  strings; the chain provider fills them from real program accounts. */
export interface MarketChainMeta {
  /** PDA / account address of the market. */
  marketAccount: string;
  /** Oracle program id (TxLINE). */
  oracleProgram: string;
  /** SPL mint used for settlement (USDC). */
  settlementMint: string;
  /** Human-readable resolution source. */
  resolutionSource: string;
}

export interface Market {
  id: string;
  home: TeamCode;
  away: TeamCode;
  status: MarketStatus;
  comp: string;
  venue: string;
  predicate: Predicate;

  /** Live/settled score, or null before kickoff. */
  score: [number, number] | null;
  /** Live match minute. */
  minute?: number;
  /** Kickoff display for upcoming markets. */
  kickoffTime?: string;
  kickoffDay?: string;

  /** Implied YES probability, 0–100. */
  yesPct: number;
  /** Escrowed pools, in whole USDC. */
  pools: { yes: number; no: number };

  /** Live-only: humanized time-to-settlement. */
  settlesIn?: string;
  /** Settled-only. */
  result?: "YES" | "NO";
  resolvedAgo?: string;

  chain: MarketChainMeta;
}

export interface MerkleNode {
  /** e.g. "H(0,1)". */
  label: string;
  hash: string;
}

export interface MerkleLeaf {
  /** e.g. "GOAL_EVENT". */
  tag: string;
  /** e.g. "BRA · 23'". */
  sub: string;
  hash: string;
}

export interface MerkleProof {
  root: string;
  /** Truncated root for the tree node label. */
  rootShort: string;
  /** The leaf whose inclusion is being proven. */
  proofLeaf: string;
  nodes: MerkleNode[];
  leaves: MerkleLeaf[];
}

export interface SettlementReceipt {
  id: string;
  marketId: string;
  receiptNo: string;

  /** Title parts: "Total goals" / "> 2.5" / "YES wins". */
  title: { main: string; op: string; outcome: string };
  outcome: "YES" | "NO";

  /** The single verified statistic, e.g. "3 goals". */
  verifiedStat: string;
  /** Predicate line label, e.g. "Over 2.5". */
  predicateLineLabel: string;
  /** Numeric line used in the prose, e.g. "2.5". */
  lineValue: string;

  fixture: { home: string; away: string; score: string };

  merkle: MerkleProof;

  solana: {
    txSignature: string;
    slot: number;
    settledAt: string;
    /** Cluster the tx lives on — drives the explorer link. */
    cluster: "devnet" | "testnet" | "mainnet-beta";
  };

  pool: { amount: number; side: "YES" | "NO" };
}

export interface TickerMatch {
  home: TeamCode;
  score: string;
  away: TeamCode;
  min: string;
}

export interface PortfolioSummary {
  /** USDC balance, whole units. */
  balanceUsdc: number;
  /** Truncated wallet address for display. */
  wallet: string;
}
