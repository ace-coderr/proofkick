// Anchor program bootstrap for the deployed ProofKick settlement program.
//
// Read-only access needs no wallet, so `getReadProgram()` wires a no-op wallet.
// Write paths (place position, claim, …) are built in lib/anchor/actions.ts
// against a real wallet-adapter wallet.
import {
  AnchorProvider,
  Program,
  type Idl,
  type Wallet,
} from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  type ConfirmOptions,
} from "@solana/web3.js";
import idlJson from "@/lib/idl/proofkick.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "921ys67mT4rn62pg2ZvfkrNoS581bU6u3QJojtBV71Qm",
);

// TxLINE / txoracle program used by verify_outcome's CPI.
export const TXORACLE_PROGRAM_ID = new PublicKey(
  "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

export const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ??
  "devnet") as "devnet" | "testnet" | "mainnet-beta";

export const proofkickIdl = idlJson as Idl;

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

// A wallet that can't sign — sufficient for account reads and `.view()` calls.
const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: Transaction) => tx,
  signAllTransactions: async (txs: Transaction[]) => txs,
} as unknown as Wallet;

export function getReadProgram(connection: Connection = getConnection()): Program {
  const provider = new AnchorProvider(connection, READONLY_WALLET, {
    commitment: "confirmed",
  });
  return new Program(proofkickIdl, provider);
}

export function getWriteProgram(
  connection: Connection,
  wallet: Wallet,
  opts: ConfirmOptions = { commitment: "confirmed" },
): Program {
  const provider = new AnchorProvider(connection, wallet, opts);
  return new Program(proofkickIdl, provider);
}

// ── PDA helpers ────────────────────────────────────────────────────────────
const enc = (s: string) => Buffer.from(s);

export function vaultPda(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("vault"), market.toBuffer()], PROGRAM_ID)[0];
}

export function positionPda(market: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc("position"), market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function outcomePda(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("outcome"), market.toBuffer()], PROGRAM_ID)[0];
}

export function marketPda(fixtureId: bigint, marketNonce: bigint): PublicKey {
  const fid = Buffer.alloc(8);
  fid.writeBigInt64LE(fixtureId);
  const nonce = Buffer.alloc(8);
  nonce.writeBigUInt64LE(marketNonce);
  return PublicKey.findProgramAddressSync([enc("market"), fid, nonce], PROGRAM_ID)[0];
}
