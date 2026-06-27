// Decoded shapes of the ProofKick program accounts.
//
// These mirror the structs in target/idl/proofkick.json. Anchor decodes account
// data into camelCased JS objects; `BN` is used for 64-bit integers and enums
// arrive as single-key objects (e.g. { open: {} }).
import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

export type AnchorEnum<K extends string> = { [P in K]?: Record<string, never> };

export type SideEnum = AnchorEnum<"yes" | "no">;
export type MarketStatusEnum = AnchorEnum<"open" | "verified" | "settled">;
export type ComparisonEnum = AnchorEnum<"greaterThan" | "lessThan" | "equalTo">;
export type BinaryOpEnum = AnchorEnum<"add" | "subtract">;

export interface OnchainMarket {
  authority: PublicKey;
  fixtureId: BN;
  marketNonce: BN;
  statAKey: number;
  statAPeriod: number;
  statBKey: number | null;
  statBPeriod: number;
  op: BinaryOpEnum | null;
  comparison: ComparisonEnum;
  threshold: number;
  usdcMint: PublicKey;
  vault: PublicKey;
  totalYes: BN;
  totalNo: BN;
  status: MarketStatusEnum;
  winningSide: SideEnum | null;
  bump: number;
  vaultBump: number;
}

export interface OnchainPosition {
  market: PublicKey;
  owner: PublicKey;
  side: SideEnum;
  amount: BN;
  claimed: boolean;
  bump: number;
}

export interface OnchainVerifiedOutcome {
  market: PublicKey;
  predicateHeld: boolean;
  ts: BN;
  bump: number;
}
