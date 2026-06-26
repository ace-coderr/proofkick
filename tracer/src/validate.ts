/**
 * proofkick tracer — end-to-end on-chain stat validation against TxLINE devnet.
 *
 * Flow:
 *   1. Subscribe to free Service Level 1 (World Cup / Int Friendlies, 60s delay)
 *   2. Activate an API token (guest JWT + tweetnacl wallet signature)
 *   3. Fetch a stat-validation Merkle proof from the TxLINE devnet API
 *   4. Replay it through validate_stat().view() on the Anchor program
 *
 * Run: npx ts-node src/validate.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";

// ----------------------------------------------------------------------------
// Constants (devnet)
// ----------------------------------------------------------------------------
const API = "https://txline-dev.txodds.com";
const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

// Subscription accounts (verified against a live on-chain `subscribe` tx)
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies, 60-second delay
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = []; // empty = standard bundle

const idl = JSON.parse(fs.readFileSync(__dirname + "/../../idls/txline.json", "utf8"));
// The shipped IDL omits the `returns` annotation on validate_stat; without it
// Anchor refuses `.view()`. The on-chain handler returns a bool, so add it.
const validateStatIx = idl.instructions.find((i: any) => i.name === "validate_stat");
if (validateStatIx && !validateStatIx.returns) validateStatIx.returns = "bool";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Coerce an API-returned 32-byte hash (number[] | hex | base64) to number[]
function toBytes(h: any): number[] {
  if (Array.isArray(h)) return h;
  if (typeof h === "string") {
    if (/^[0-9a-fA-F]{64}$/.test(h)) return Array.from(Buffer.from(h, "hex"));
    return Array.from(Buffer.from(h, "base64"));
  }
  if (h && typeof h === "object") return Object.values(h) as number[];
  throw new Error("unrecognized hash encoding: " + JSON.stringify(h));
}

const mapProof = (nodes: any[]) =>
  (nodes || []).map((n) => ({ hash: toBytes(n.hash), isRightSibling: n.isRightSibling }));

// ----------------------------------------------------------------------------
async function main() {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")));
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  console.log("wallet:", keypair.publicKey.toBase58());

  // ---- 1. Subscribe to free Service Level 1 -------------------------------
  const pricingMatrix = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], PROGRAM_ID)[0];
  const tokenTreasuryPda = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], PROGRAM_ID)[0];
  const tokenTreasuryVault = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);

  // The program expects the user's Token-2022 ATA to already exist.
  const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey,
    userTokenAccount,
    keypair.publicKey,
    SUBSCRIPTION_MINT,
    TOKEN_2022_PROGRAM_ID
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
    console.log("subscribed:", txSig);
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("ActiveSubscription") || msg.includes("6016")) {
      // Already subscribed — reuse the most recent on-chain tx from this wallet
      // for the activation signature.
      const sigs = await connection.getSignaturesForAddress(keypair.publicKey, { limit: 10 });
      const recent = sigs.find((s) => !s.err);
      if (!recent) throw new Error("already subscribed but no recent tx to sign for activation");
      txSig = recent.signature;
      console.log("already subscribed; reusing tx:", txSig);
    } else {
      throw e;
    }
  }

  // ---- 2. Activate API token (guest JWT + wallet signature) ----------------
  const jwt: string = (await axios.post(`${API}/auth/guest/start`, {})).data.token;
  console.log("guest jwt acquired");

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const activation = await axios.post(
    `${API}/api/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  const apiToken = activation.data.token || activation.data;
  console.log("api token activated");

  const http = axios.create({
    timeout: 30000,
    baseURL: API,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });

  // ---- 3. Discover a fixture/seq/statKey and fetch stat-validation --------
  const validation = await fetchValidation(http);
  if (!validation) throw new Error("could not obtain a stat-validation proof");

  // ---- 4. Replay through validate_stat().view() ---------------------------
  const v = validation.data;
  const fixtureSummary = {
    fixtureId: new BN(v.summary.fixtureId),
    updateStats: {
      updateCount: v.summary.updateStats.updateCount,
      minTimestamp: new BN(v.summary.updateStats.minTimestamp),
      maxTimestamp: new BN(v.summary.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: toBytes(v.summary.eventStatsSubTreeRoot ?? v.summary.eventsSubTreeRoot),
  };
  const fixtureProof = mapProof(v.subTreeProof);
  const mainTreeProof = mapProof(v.mainTreeProof);
  const stat1 = {
    statToProve: {
      key: v.statToProve.key,
      value: v.statToProve.value,
      period: v.statToProve.period,
    },
    eventStatRoot: toBytes(v.eventStatRoot),
    statProof: mapProof(v.statProof),
  };
  const predicate = { threshold: 0, comparison: { greaterThan: {} } };
  const targetTs = new BN(v.summary.updateStats.minTimestamp);

  const epochDay = Math.floor(Number(v.summary.updateStats.minTimestamp) / (24 * 60 * 60 * 1000));
  const dailyScoresPda = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    PROGRAM_ID
  )[0];
  console.log("epochDay:", epochDay, "dailyScoresPda:", dailyScoresPda.toBase58());

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });

  const isValid = await program.methods
    .validateStat(targetTs, fixtureSummary, fixtureProof, mainTreeProof, predicate, stat1, null, null)
    .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
    .preInstructions([computeBudgetIx])
    .view();

  console.log("\n=== validate_stat result ===");
  console.log("fixtureId:", v.summary.fixtureId, "stat:", v.statToProve, "predicate: value > 0");
  console.log("RESULT:", isValid);
}

// ----------------------------------------------------------------------------
// Try the documented example first, then discover live fixtures via updates.
// ----------------------------------------------------------------------------
async function fetchValidation(http: any): Promise<{ params: any; data: any } | null> {
  const tryFetch = async (params: any) => {
    try {
      const res = await http.get("/api/scores/stat-validation", { params });
      console.log("  stat-validation OK for", JSON.stringify(params));
      return { params, data: res.data };
    } catch (e: any) {
      console.log("  stat-validation", e.response?.status, JSON.stringify(e.response?.data)?.slice(0, 120), "for", JSON.stringify(params));
      return null;
    }
  };

  // a) documented example
  let r = await tryFetch({ fixtureId: 17952170, seq: 941, statKey: 1002 });
  if (r) return r;

  // b) discover live fixtures from recent score updates (account for 60s delay)
  for (let back = 1; back <= 12; back++) {
    const t = new Date(Date.now() - back * 5 * 60 * 1000);
    const epochDay = Math.floor(t.getTime() / 86400000);
    const hour = t.getUTCHours();
    const interval = Math.floor(t.getUTCMinutes() / 5);
    let updates: any;
    try {
      updates = (await http.get(`/api/scores/updates/${epochDay}/${hour}/${interval}`)).data;
    } catch (e: any) {
      console.log("  updates", e.response?.status, `${epochDay}/${hour}/${interval}`);
      continue;
    }
    const list: any[] = Array.isArray(updates) ? updates : updates?.updates || updates?.data || [];
    console.log(`  updates ${epochDay}/${hour}/${interval}: ${list.length} entries`);
    if (list.length) console.log("    sample:", JSON.stringify(list[0]).slice(0, 300));
    for (const u of list.slice(0, 5)) {
      const fixtureId = u.fixtureId ?? u.fixture_id ?? u.fixtureID;
      const seq = u.seq ?? u.sequence ?? u.seqNo;
      const statKey = u.statKey ?? u.key ?? u.stat_key ?? 1002;
      if (fixtureId == null || seq == null) continue;
      r = await tryFetch({ fixtureId, seq, statKey });
      if (r) return r;
    }
  }
  return null;
}

main().catch((e) => {
  console.error("FAILED:", e?.message || e);
  if (e?.logs) console.error(e.logs);
  process.exit(1);
});
