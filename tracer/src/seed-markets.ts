/**
 * seed-markets.ts — populate the deployed ProofKick program with real on-chain
 * markets on devnet.
 *
 *   program: 921ys67mT4rn62pg2ZvfkrNoS581bU6u3QJojtBV71Qm
 *
 * What it does:
 *   1. Mints a fresh test USDC (6 decimals, our keypair authority) and funds
 *      our keypair + the Phantom wallet with 10,000 each.
 *   2. Creates 3 markets via create_market on the real World Cup fixture our
 *      captured TxLINE proof covers (17952170):
 *        - M1  open  "total goals > 2.5"   (key 1002 / period 4, GT, threshold 2)
 *        - M2  open  "total goals < 3.5"   (key 1002 / period 4, LT, threshold 4)
 *        - M3  to settle "total goals > 0" (key 1002 / period 4, GT, threshold 0)
 *   3. Escrows a YES position (our keypair) and a NO position (a freshly
 *      generated, funded keypair) on every market.
 *   4. Settles M3: replays the real captured TxLINE proof through verify_outcome
 *      (CPI into TxLINE validate_stat) then settle_market.
 *
 * The proof flow / fixture is the one produced by capture-proof.ts and exercised
 * by validate.ts; its daily_scores_roots PDA is still live on devnet, so the CPI
 * verification reproduces on-chain.
 *
 * Run: npx ts-node src/seed-markets.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";

const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("921ys67mT4rn62pg2ZvfkrNoS581bU6u3QJojtBV71Qm");
const TXORACLE = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const PHANTOM = new PublicKey("HHS9PDUQWG7o1pw5MpdmjQ8vjaNwPE6TU2M2GLuR7ox7");

const idl = JSON.parse(fs.readFileSync(__dirname + "/../../target/idl/proofkick.json", "utf8"));
// Real TxLINE proof captured by capture-proof.ts (fixture 17952170, stat 1002/period 4 = 1).
const proof = JSON.parse(fs.readFileSync(__dirname + "/../../tests/fixtures/proof.json", "utf8"));

const USDC = (n: number) => new BN(n).mul(new BN(1_000_000)); // 6 decimals
const seed = (s: string) => Buffer.from(s);

// PDA helpers (seeds mirror the on-chain program)
const marketPda = (fixtureId: BN, nonce: BN) =>
  PublicKey.findProgramAddressSync(
    [seed("market"), fixtureId.toArrayLike(Buffer, "le", 8), nonce.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
const vaultPda = (market: PublicKey) =>
  PublicKey.findProgramAddressSync([seed("vault"), market.toBuffer()], PROGRAM_ID)[0];
const outcomePda = (market: PublicKey) =>
  PublicKey.findProgramAddressSync([seed("outcome"), market.toBuffer()], PROGRAM_ID)[0];
const positionPda = (market: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [seed("position"), market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  )[0];

// Treat "account already in use" as success so the script is re-runnable.
function isAlreadyInUse(e: any): boolean {
  const m = (e?.message || "") + JSON.stringify(e?.logs || []);
  return m.includes("already in use") || m.includes("custom program error: 0x0");
}

async function main() {
  const secret = Uint8Array.from(
    JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8"))
  );
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  console.log("keypair (authority/YES bettor):", keypair.publicKey.toBase58());
  console.log("phantom  (USDC recipient)     :", PHANTOM.toBase58());

  // ---- 1. Test USDC mint + funding ----------------------------------------
  const usdcMint = await createMint(connection, keypair, keypair.publicKey, null, 6);
  console.log("\n=== USDC mint:", usdcMint.toBase58(), "===");

  const myAta = (await getOrCreateAssociatedTokenAccount(connection, keypair, usdcMint, keypair.publicKey)).address;
  const phantomAta = (await getOrCreateAssociatedTokenAccount(connection, keypair, usdcMint, PHANTOM)).address;
  await mintTo(connection, keypair, usdcMint, myAta, keypair, BigInt(USDC(10_000).toString()));
  await mintTo(connection, keypair, usdcMint, phantomAta, keypair, BigInt(USDC(10_000).toString()));
  console.log("minted 10,000 USDC -> keypair ATA", myAta.toBase58());
  console.log("minted 10,000 USDC -> phantom ATA", phantomAta.toBase58());

  // ---- 2. Second bettor (NO side): generate + fund SOL + USDC --------------
  const noBettor = Keypair.generate();
  console.log("\nNO bettor (generated):", noBettor.publicKey.toBase58());
  const fundSol = await connection.sendTransaction(
    (() => {
      const tx = new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: noBettor.publicKey,
          lamports: 0.4 * LAMPORTS_PER_SOL,
        })
      );
      return tx;
    })(),
    [keypair]
  );
  await connection.confirmTransaction(fundSol, "confirmed");
  const noAta = (await getOrCreateAssociatedTokenAccount(connection, keypair, usdcMint, noBettor.publicKey)).address;
  await mintTo(connection, keypair, usdcMint, noAta, keypair, BigInt(USDC(10_000).toString()));
  console.log("funded NO bettor: 0.4 SOL + 10,000 USDC");

  // ---- 3. Market definitions ----------------------------------------------
  const fixtureId = new BN(proof.fixtureId); // 17952170 — the real WC fixture our proof covers
  const statKey = proof.statKey; // 1002 (goals)
  const statPeriod = proof.validation.statToProve.period; // 4 (full match)

  const markets = [
    {
      label: 'M1 open "total goals > 2.5"',
      nonce: new BN(0),
      cfg: {
        statAKey: statKey, statAPeriod: statPeriod,
        statBKey: null, statBPeriod: 0, op: null,
        comparison: { greaterThan: {} }, threshold: 2, // > 2  ==  > 2.5
      },
      settle: false,
    },
    {
      label: 'M2 open "total goals < 3.5"',
      nonce: new BN(1),
      cfg: {
        statAKey: statKey, statAPeriod: statPeriod,
        statBKey: null, statBPeriod: 0, op: null,
        comparison: { lessThan: {} }, threshold: 4, // < 4  ==  < 3.5
      },
      settle: false,
    },
    {
      label: 'M3 settle "total goals > 0"',
      nonce: new BN(2),
      cfg: {
        statAKey: statKey, statAPeriod: statPeriod,
        statBKey: null, statBPeriod: 0, op: null,
        comparison: { greaterThan: {} }, threshold: 0, // proof value is 1 -> YES
      },
      settle: true,
    },
  ];

  const created: { label: string; market: PublicKey; nonce: BN; settle: boolean }[] = [];

  for (const m of markets) {
    const market = marketPda(fixtureId, m.nonce);
    const vault = vaultPda(market);

    // create_market
    try {
      const sig = await program.methods
        .createMarket(fixtureId, m.nonce, m.cfg)
        .accounts({
          authority: keypair.publicKey,
          usdcMint,
          market,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log(`\n${m.label}\n  market: ${market.toBase58()}\n  created: ${sig}`);
    } catch (e: any) {
      if (isAlreadyInUse(e)) console.log(`\n${m.label}\n  market: ${market.toBase58()} (already existed, reusing)`);
      else throw e;
    }

    // YES from keypair
    await placePosition(program, market, vault, keypair, myAta, { yes: {} }, USDC(100), keypair);
    // NO from second bettor
    await placePosition(program, market, vault, noBettor, noAta, { no: {} }, USDC(50), keypair);
    console.log("  positions: YES 100 (keypair), NO 50 (no-bettor)");

    created.push({ label: m.label, market, nonce: m.nonce, settle: m.settle });
  }

  // ---- 4. Settle M3 via the real captured TxLINE proof --------------------
  const m3 = created.find((c) => c.settle)!;
  const outcome = outcomePda(m3.market);
  const v = proof.validation;
  const mapNode = (n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling });
  const fixtureSummary = {
    fixtureId: new BN(v.summary.fixtureId),
    updateStats: {
      updateCount: v.summary.updateStats.updateCount,
      minTimestamp: new BN(v.summary.updateStats.minTimestamp),
      maxTimestamp: new BN(v.summary.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: v.summary.eventStatsSubTreeRoot,
  };
  const statA = {
    statToProve: { key: v.statToProve.key, value: v.statToProve.value, period: v.statToProve.period },
    eventStatRoot: v.eventStatRoot,
    statProof: v.statProof.map(mapNode),
  };

  console.log(`\n=== settling ${m3.label} ===`);
  try {
    const verifySig = await program.methods
      .verifyOutcome(
        new BN(proof.targetTs),
        fixtureSummary,
        v.subTreeProof.map(mapNode),
        v.mainTreeProof.map(mapNode),
        statA,
        null
      )
      .accounts({
        payer: keypair.publicKey,
        market: m3.market,
        outcome,
        dailyScoresMerkleRoots: new PublicKey(proof.dailyScoresPda),
        txoracleProgram: TXORACLE,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();
    console.log("  verify_outcome:", verifySig);
  } catch (e: any) {
    if (isAlreadyInUse(e)) console.log("  verify_outcome: outcome already verified, reusing");
    else throw e;
  }
  const o = await program.account.verifiedOutcome.fetch(outcome);
  console.log("  predicate_held:", o.predicateHeld);

  const settleSig = await program.methods
    .settleMarket()
    .accounts({ market: m3.market, outcome })
    .rpc();
  console.log("  settle_market:", settleSig);

  // ---- 5. Summary ---------------------------------------------------------
  console.log("\n========================= SUMMARY =========================");
  console.log("USDC mint        :", usdcMint.toBase58());
  for (const c of created) {
    const mAcc = await program.account.market.fetch(c.market);
    console.log(
      `${c.label}\n  PDA   : ${c.market.toBase58()}\n  status: ${Object.keys(mAcc.status)[0]}` +
        (mAcc.winningSide ? `  winningSide: ${Object.keys(mAcc.winningSide)[0]}` : "")
    );
  }
  console.log("settlement tx    :", settleSig);
  console.log("===========================================================");

  // ---- 6. Confirm with program.account.market.all() -----------------------
  const all = await program.account.market.all();
  const mine = all.filter((a) => a.account.usdcMint.equals(usdcMint));
  console.log(`\nprogram.account.market.all(): ${all.length} total markets on-chain, ${mine.length} from this run:`);
  for (const a of mine) {
    console.log(
      `  ${a.publicKey.toBase58()}  fixture=${a.account.fixtureId.toString()} nonce=${a.account.marketNonce.toString()}` +
        ` status=${Object.keys(a.account.status)[0]} yes=${a.account.totalYes.toString()} no=${a.account.totalNo.toString()}`
    );
  }
}

async function placePosition(
  program: anchor.Program,
  market: PublicKey,
  vault: PublicKey,
  owner: Keypair,
  ownerAta: PublicKey,
  side: any,
  amount: BN,
  feePayer: Keypair
) {
  const position = positionPda(market, owner.publicKey);
  try {
    await program.methods
      .placePosition(side, amount)
      .accounts({
        owner: owner.publicKey,
        market,
        vault,
        ownerTokenAccount: ownerAta,
        position,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
  } catch (e: any) {
    if (isAlreadyInUse(e)) return; // position already placed
    throw e;
  }
}

main().catch((e) => {
  console.error("FAILED:", e?.message || e);
  if (e?.logs) console.error(e.logs);
  process.exit(1);
});
