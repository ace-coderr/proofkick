// Server-only: acquire TxLINE API credentials (guest JWT + activated API token).
//
// This mirrors tracer/src/validate.ts: subscribe to the free Service Level 1 on
// devnet (or reuse an existing subscription), then activate an API token by
// signing the subscription tx with the server keypair. Credentials are cached in
// module memory with a TTL so the ticker route doesn't re-subscribe per request.
//
// Requires a funded, subscribed devnet keypair, provided via one of:
//   TXLINE_KEYPAIR       — JSON array secret key, e.g. "[12,34,...]"
//   TXLINE_KEYPAIR_PATH  — path to a solana id.json (default ~/.config/solana/id.json)
// If none is usable, getCredentials() returns null and the caller falls back to mock.
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import nacl from "tweetnacl";
import fs from "fs";
import os from "os";
import path from "path";
import txlineIdl from "@/lib/idl/txline.json";

const API = process.env.TXLINE_API_BASE ?? "https://txline-dev.txodds.com";
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
const TXLINE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const SERVICE_LEVEL_ID = 1;
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

export interface TxlineCredentials {
  jwt: string;
  apiToken: string;
  api: string;
}

let cache: { creds: TxlineCredentials; expires: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

// The token endpoints sometimes return a bare token string rather than JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readMaybeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

function loadKeypair(): Keypair | null {
  try {
    const inline = process.env.TXLINE_KEYPAIR;
    if (inline) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(inline)));
    const p =
      process.env.TXLINE_KEYPAIR_PATH ?? path.join(os.homedir(), ".config", "solana", "id.json");
    if (!fs.existsSync(p)) return null;
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
  } catch {
    return null;
  }
}

export async function getCredentials(): Promise<TxlineCredentials | null> {
  if (cache && cache.expires > Date.now()) return cache.creds;

  const keypair = loadKeypair();
  if (!keypair) return null;

  try {
    const connection = new Connection(RPC, "confirmed");
    // Build a minimal signing wallet inline: @coral-xyz/anchor's `Wallet` class
    // isn't exported to bundlers, so we avoid referencing it at runtime.
    const wallet = {
      publicKey: keypair.publicKey,
      payer: keypair,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(keypair);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        txs.forEach((t) => t.partialSign(keypair));
        return txs;
      },
    } as unknown as anchor.Wallet;
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new anchor.Program(txlineIdl as anchor.Idl, provider);

    const pricingMatrix = PublicKey.findProgramAddressSync(
      [Buffer.from("pricing_matrix")],
      TXLINE_PROGRAM_ID,
    )[0];
    const tokenTreasuryPda = PublicKey.findProgramAddressSync(
      [Buffer.from("token_treasury_v2")],
      TXLINE_PROGRAM_ID,
    )[0];
    const tokenTreasuryVault = getAssociatedTokenAddressSync(
      SUBSCRIPTION_MINT,
      tokenTreasuryPda,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    const userTokenAccount = getAssociatedTokenAddressSync(
      SUBSCRIPTION_MINT,
      keypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      keypair.publicKey,
      userTokenAccount,
      keypair.publicKey,
      SUBSCRIPTION_MINT,
      TOKEN_2022_PROGRAM_ID,
    );

    let txSig: string;
    try {
      txSig = await program.methods
        .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
        .preInstructions([createUserAtaIx])
        .accounts({
          user: keypair.publicKey,
          pricingMatrix,
          tokenMint: SUBSCRIPTION_MINT,
          userTokenAccount,
          tokenTreasuryVault,
          tokenTreasuryPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      if (msg.includes("ActiveSubscription") || msg.includes("6016")) {
        const sigs = await connection.getSignaturesForAddress(keypair.publicKey, { limit: 10 });
        const recent = sigs.find((s) => !s.err);
        if (!recent) throw new Error("subscribed but no recent tx to sign for activation");
        txSig = recent.signature;
      } else {
        throw e;
      }
    }

    const guestRes = await fetch(`${API}/auth/guest/start`, { method: "POST" });
    if (!guestRes.ok) throw new Error(`guest/start ${guestRes.status}: ${(await guestRes.text()).slice(0, 80)}`);
    const guestData = await readMaybeJson(guestRes);
    const jwt: string = typeof guestData === "string" ? guestData : guestData.token;
    if (!jwt) throw new Error("guest/start returned no token");

    const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
    const signatureBytes = nacl.sign.detached(
      new TextEncoder().encode(messageString),
      keypair.secretKey,
    );
    const walletSignature = Buffer.from(signatureBytes).toString("base64");

    const actRes = await fetch(`${API}/api/token/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
    });
    if (!actRes.ok) throw new Error(`token/activate ${actRes.status}: ${(await actRes.text()).slice(0, 80)}`);
    const actData = await readMaybeJson(actRes);
    const apiToken: string = typeof actData === "string" ? actData : actData.token || actData;
    if (!apiToken) throw new Error("token/activate returned no token");

    const creds: TxlineCredentials = { jwt, apiToken, api: API };
    cache = { creds, expires: Date.now() + TTL_MS };
    return creds;
  } catch (e) {
    console.error("[txline auth] failed:", (e as Error).message);
    return null;
  }
}
