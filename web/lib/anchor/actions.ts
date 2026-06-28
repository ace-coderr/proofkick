// Write paths against the deployed ProofKick program.
//
// Each function takes a wallet-adapter `AnchorWallet` + a Connection, builds the
// real instruction via Anchor, and sends it. PDAs (vault, position, outcome) are
// resolved here explicitly so the calls work regardless of IDL seed inference.
import { BN, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getWriteProgram,
  outcomePda,
  positionPda,
  vaultPda,
  marketPda,
  TXORACLE_PROGRAM_ID,
} from "./program";
import type { OnchainMarket } from "./types";

const USDC_DECIMALS = 6;
const toBase = (whole: number) => new BN(Math.round(whole * 10 ** USDC_DECIMALS));

export type Side = "yes" | "no";
const sideArg = (s: Side) => (s === "yes" ? { yes: {} } : { no: {} });

export interface Comparison {
  greaterThan?: Record<string, never>;
  lessThan?: Record<string, never>;
  equalTo?: Record<string, never>;
}

export interface PredicateConfig {
  statAKey: number;
  statAPeriod: number;
  statBKey: number | null;
  statBPeriod: number;
  op: { add?: Record<string, never>; subtract?: Record<string, never> } | null;
  comparison: Comparison;
  threshold: number;
}

// ── create_market ───────────────────────────────────────────────────────────
export async function createMarket(
  connection: Connection,
  wallet: Wallet,
  args: { fixtureId: number | bigint; marketNonce: number | bigint; usdcMint: PublicKey; cfg: PredicateConfig },
): Promise<{ signature: string; market: PublicKey }> {
  const program = getWriteProgram(connection, wallet);
  const fixtureId = BigInt(args.fixtureId);
  const marketNonce = BigInt(args.marketNonce);
  const market = marketPda(fixtureId, marketNonce);

  const signature = await program.methods
    .createMarket(new BN(fixtureId.toString()), new BN(marketNonce.toString()), args.cfg)
    .accountsPartial({
      authority: wallet.publicKey,
      usdcMint: args.usdcMint,
      market,
      vault: vaultPda(market),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, market };
}

// ── place_position ───────────────────────────────────────────────────────────
// The on-chain instruction uses `init_if_needed` for the Position PDA, so this
// single call both opens a new position and tops up an existing one (same wallet
// + market + side) — a repeat buy adds to the stake instead of failing with
// "account already in use". Adding to the opposite side is rejected on-chain.
export async function placePosition(
  connection: Connection,
  wallet: Wallet,
  args: { market: PublicKey; usdcMint: PublicKey; side: Side; amountUsdc: number },
): Promise<string> {
  const program = getWriteProgram(connection, wallet);
  const ownerToken = getAssociatedTokenAddressSync(args.usdcMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);

  // Ensure the owner's USDC ATA exists (idempotent).
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    wallet.publicKey,
    ownerToken,
    wallet.publicKey,
    args.usdcMint,
    TOKEN_PROGRAM_ID,
  );

  return program.methods
    .placePosition(sideArg(args.side), toBase(args.amountUsdc))
    .accountsPartial({
      owner: wallet.publicKey,
      market: args.market,
      vault: vaultPda(args.market),
      ownerTokenAccount: ownerToken,
      position: positionPda(args.market, wallet.publicKey),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([ataIx])
    .rpc();
}

// ── verify_outcome ────────────────────────────────────────────────────────────
// Forwards a TxLINE Merkle proof bundle through the CPI. The proof is produced by
// the tracer flow (tracer/src/capture-proof.ts); shapes mirror the IDL types.
export async function verifyOutcome(
  connection: Connection,
  wallet: Wallet,
  args: {
    market: PublicKey;
    dailyScoresMerkleRoots: PublicKey;
    ts: number | bigint;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fixtureSummary: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fixtureProof: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mainTreeProof: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statA: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statB?: any | null;
  },
): Promise<string> {
  const program = getWriteProgram(connection, wallet);
  return program.methods
    .verifyOutcome(
      new BN(args.ts.toString()),
      args.fixtureSummary,
      args.fixtureProof,
      args.mainTreeProof,
      args.statA,
      args.statB ?? null,
    )
    .accountsPartial({
      payer: wallet.publicKey,
      market: args.market,
      outcome: outcomePda(args.market),
      dailyScoresMerkleRoots: args.dailyScoresMerkleRoots,
      txoracleProgram: TXORACLE_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ── settle_market ─────────────────────────────────────────────────────────────
export async function settle(
  connection: Connection,
  wallet: Wallet,
  market: PublicKey,
): Promise<string> {
  const program = getWriteProgram(connection, wallet);
  return program.methods
    .settleMarket()
    .accountsPartial({
      market,
      outcome: outcomePda(market),
    })
    .rpc();
}

// ── claim ─────────────────────────────────────────────────────────────────────
export async function claim(
  connection: Connection,
  wallet: Wallet,
  args: { market: PublicKey; usdcMint: PublicKey },
): Promise<string> {
  const program = getWriteProgram(connection, wallet);
  const ownerToken = getAssociatedTokenAddressSync(args.usdcMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    wallet.publicKey,
    ownerToken,
    wallet.publicKey,
    args.usdcMint,
    TOKEN_PROGRAM_ID,
  );

  return program.methods
    .claim()
    .accountsPartial({
      owner: wallet.publicKey,
      market: args.market,
      vault: vaultPda(args.market),
      ownerTokenAccount: ownerToken,
      position: positionPda(args.market, wallet.publicKey),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([ataIx])
    .rpc();
}

// ── reads used by client pages (Portfolio) ────────────────────────────────────
export async function fetchPositionsForOwner(
  connection: Connection,
  owner: PublicKey,
): Promise<{ market: PublicKey; side: Side; amount: BN; claimed: boolean }[]> {
  // Read-only: build a program against any wallet (owner unused for reads).
  const program = getWriteProgram(connection, { publicKey: owner } as Wallet);
  // Position layout: market(32) + owner(32). Filter by owner at offset 8+32.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = await (program.account as any).position.all([
    { memcmp: { offset: 8 + 32, bytes: owner.toBase58() } },
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return accounts.map((a: any) => ({
    market: a.account.market as PublicKey,
    side: (Object.keys(a.account.side)[0] as Side) ?? "yes",
    amount: a.account.amount,
    claimed: a.account.claimed,
  }));
}

export async function fetchMarket(
  connection: Connection,
  market: PublicKey,
): Promise<OnchainMarket> {
  const program = getWriteProgram(connection, { publicKey: market } as Wallet);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await (program.account as any).market.fetch(market)) as OnchainMarket;
}
