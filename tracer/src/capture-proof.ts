/**
 * Capture a real stat-validation proof from TxLINE devnet and save it as a
 * deterministic fixture for the ProofKick anchor test.
 *
 * Reuses the subscribe -> activate -> fetch flow from validate.ts.
 * Output: ../tests/fixtures/proof.json
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
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

const API = "https://txline-dev.txodds.com";
const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const SERVICE_LEVEL_ID = 1;
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

// The fixture/stat we validated end-to-end in validate.ts (returns true).
const FIXTURE_ID = 17952170;
const SEQ = 941;
const STAT_KEY = 1002;

const idl = JSON.parse(fs.readFileSync(__dirname + "/../../idls/txline.json", "utf8"));

async function main() {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")));
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const pricingMatrix = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], PROGRAM_ID)[0];
  const tokenTreasuryPda = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], PROGRAM_ID)[0];
  const tokenTreasuryVault = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey, userTokenAccount, keypair.publicKey, SUBSCRIPTION_MINT, TOKEN_2022_PROGRAM_ID
  );

  const txSig: string = await program.methods
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

  const jwt: string = (await axios.post(`${API}/auth/guest/start`, {})).data.token;
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
    timeout: 30000, baseURL: API,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });

  const res = await http.get("/api/scores/stat-validation", { params: { fixtureId: FIXTURE_ID, seq: SEQ, statKey: STAT_KEY } });
  const validation = res.data;

  const minTs = Number(validation.summary.updateStats.minTimestamp);
  const epochDay = Math.floor(minTs / (24 * 60 * 60 * 1000));
  const dailyScoresPda = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new anchor.BN(epochDay).toArrayLike(Buffer, "le", 2)],
    PROGRAM_ID
  )[0].toBase58();

  const out = { fixtureId: FIXTURE_ID, seq: SEQ, statKey: STAT_KEY, targetTs: minTs, epochDay, dailyScoresPda, validation };
  const outPath = __dirname + "/../../tests/fixtures/proof.json";
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("wrote", outPath);
  console.log("dailyScoresPda:", dailyScoresPda, "targetTs:", minTs, "epochDay:", epochDay);
  console.log("stat:", JSON.stringify(validation.statToProve));
}

main().catch((e) => { console.error("FAILED:", e?.response?.data || e?.message || e); process.exit(1); });
