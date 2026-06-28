import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Proofkick } from "../target/types/proofkick";
import {
  PublicKey,
  Keypair,
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
import { assert } from "chai";
import * as fs from "fs";

const TXORACLE = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const proof = JSON.parse(fs.readFileSync(__dirname + "/fixtures/proof.json", "utf8"));

const USDC = (n: number) => new BN(n).mul(new BN(1_000_000)); // 6 decimals

describe("proofkick settlement market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Proofkick as Program<Proofkick>;
  const conn = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  const bettorYes = Keypair.generate();
  const bettorNo = Keypair.generate();

  const fixtureId = new BN(proof.fixtureId); // 17952170
  const marketNonce = new BN(0);

  let usdcMint: PublicKey;
  let yesAta: PublicKey;
  let noAta: PublicKey;
  let market: PublicKey;
  let vault: PublicKey;
  let outcome: PublicKey;
  let posYes: PublicKey;
  let posNo: PublicKey;

  before(async () => {
    for (const pk of [payer.publicKey, bettorYes.publicKey, bettorNo.publicKey]) {
      await conn.confirmTransaction(await conn.requestAirdrop(pk, 10 * LAMPORTS_PER_SOL), "confirmed");
    }

    usdcMint = await createMint(conn, payer, payer.publicKey, null, 6);
    yesAta = (await getOrCreateAssociatedTokenAccount(conn, payer, usdcMint, bettorYes.publicKey)).address;
    noAta = (await getOrCreateAssociatedTokenAccount(conn, payer, usdcMint, bettorNo.publicKey)).address;
    await mintTo(conn, payer, usdcMint, yesAta, payer, BigInt(USDC(1000).toString()));
    await mintTo(conn, payer, usdcMint, noAta, payer, BigInt(USDC(1000).toString()));

    [market] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), marketNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], program.programId);
    [outcome] = PublicKey.findProgramAddressSync([Buffer.from("outcome"), market.toBuffer()], program.programId);
    [posYes] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), market.toBuffer(), bettorYes.publicKey.toBuffer()],
      program.programId
    );
    [posNo] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), market.toBuffer(), bettorNo.publicKey.toBuffer()],
      program.programId
    );
  });

  it("creates a market over the 'goals > 0' predicate", async () => {
    await program.methods
      .createMarket(fixtureId, marketNonce, {
        statAKey: proof.statKey, // 1002
        statAPeriod: proof.validation.statToProve.period, // 4
        statBKey: null,
        statBPeriod: 0,
        op: null,
        comparison: { greaterThan: {} },
        threshold: 0,
      })
      .accounts({
        authority: payer.publicKey,
        usdcMint,
        market,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.fixtureId.toString(), fixtureId.toString());
    assert.equal(m.statAKey, proof.statKey);
    assert.deepEqual(m.status, { open: {} });
  });

  it("escrows positions on both sides", async () => {
    await program.methods
      .placePosition({ yes: {} }, USDC(100))
      .accounts({
        owner: bettorYes.publicKey,
        market,
        vault,
        ownerTokenAccount: yesAta,
        position: posYes,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettorYes])
      .rpc();

    await program.methods
      .placePosition({ no: {} }, USDC(50))
      .accounts({
        owner: bettorNo.publicKey,
        market,
        vault,
        ownerTokenAccount: noAta,
        position: posNo,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettorNo])
      .rpc();

    const m = await program.account.market.fetch(market);
    assert.equal(m.totalYes.toString(), USDC(100).toString());
    assert.equal(m.totalNo.toString(), USDC(50).toString());
    const vaultAcc = await getAccount(conn, vault);
    assert.equal(vaultAcc.amount.toString(), USDC(150).toString());
  });

  it("tops up an existing position (init_if_needed) instead of failing", async () => {
    // Separate market (nonce 1) so this doesn't perturb the settlement flow.
    const nonce = new BN(1);
    const [mkt] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), nonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vlt] = PublicKey.findProgramAddressSync([Buffer.from("vault"), mkt.toBuffer()], program.programId);

    const bettor = Keypair.generate();
    await conn.confirmTransaction(await conn.requestAirdrop(bettor.publicKey, 2 * LAMPORTS_PER_SOL), "confirmed");
    const ata = (await getOrCreateAssociatedTokenAccount(conn, payer, usdcMint, bettor.publicKey)).address;
    await mintTo(conn, payer, usdcMint, ata, payer, BigInt(USDC(1000).toString()));

    const [pos] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), mkt.toBuffer(), bettor.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createMarket(fixtureId, nonce, {
        statAKey: proof.statKey,
        statAPeriod: proof.validation.statToProve.period,
        statBKey: null,
        statBPeriod: 0,
        op: null,
        comparison: { greaterThan: {} },
        threshold: 0,
      })
      .accounts({
        authority: payer.publicKey,
        usdcMint,
        market: mkt,
        vault: vlt,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const placeYes = (amt: BN) =>
      program.methods
        .placePosition({ yes: {} }, amt)
        .accounts({
          owner: bettor.publicKey,
          market: mkt,
          vault: vlt,
          ownerTokenAccount: ata,
          position: pos,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor])
        .rpc();

    // First buy creates the position; second buy from the same wallet must
    // succeed and accumulate rather than throwing "account already in use".
    await placeYes(USDC(100));
    await placeYes(USDC(25));

    const p = await program.account.position.fetch(pos);
    assert.equal(p.amount.toString(), USDC(125).toString(), "stake should accumulate to 125");
    assert.deepEqual(p.side, { yes: {} });
    const m = await program.account.market.fetch(mkt);
    assert.equal(m.totalYes.toString(), USDC(125).toString());
    const vaultAcc = await getAccount(conn, vlt);
    assert.equal(vaultAcc.amount.toString(), USDC(125).toString());

    // Mixing sides on an existing position is rejected.
    let mixed = false;
    try {
      await program.methods
        .placePosition({ no: {} }, USDC(10))
        .accounts({
          owner: bettor.publicKey,
          market: mkt,
          vault: vlt,
          ownerTokenAccount: ata,
          position: pos,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor])
        .rpc();
    } catch (e: any) {
      mixed = true;
      assert.match(e.toString(), /PositionSideMismatch/);
    }
    assert.isTrue(mixed, "opposite-side top-up should be rejected");
  });

  it("verifies the outcome via CPI into TxLINE validate_stat", async () => {
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
      statToProve: {
        key: v.statToProve.key,
        value: v.statToProve.value,
        period: v.statToProve.period,
      },
      eventStatRoot: v.eventStatRoot,
      statProof: v.statProof.map(mapNode),
    };

    await program.methods
      .verifyOutcome(
        new BN(proof.targetTs),
        fixtureSummary,
        v.subTreeProof.map(mapNode),
        v.mainTreeProof.map(mapNode),
        statA,
        null
      )
      .accounts({
        payer: payer.publicKey,
        market,
        outcome,
        dailyScoresMerkleRoots: new PublicKey(proof.dailyScoresPda),
        txoracleProgram: TXORACLE,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
      .rpc();

    const o = await program.account.verifiedOutcome.fetch(outcome);
    assert.equal(o.predicateHeld, true, "predicate (goals > 0) should hold on real proof");
    const m = await program.account.market.fetch(market);
    assert.deepEqual(m.status, { verified: {} });
  });

  it("settles to the YES side", async () => {
    await program.methods.settleMarket().accounts({ market, outcome }).rpc();
    const m = await program.account.market.fetch(market);
    assert.deepEqual(m.status, { settled: {} });
    assert.deepEqual(m.winningSide, { yes: {} });
  });

  it("pays the winner pro-rata and zeroes the loser", async () => {
    const yesBefore = (await getAccount(conn, yesAta)).amount;

    await program.methods
      .claim()
      .accounts({
        owner: bettorYes.publicKey,
        market,
        vault,
        ownerTokenAccount: yesAta,
        position: posYes,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bettorYes])
      .rpc();

    await program.methods
      .claim()
      .accounts({
        owner: bettorNo.publicKey,
        market,
        vault,
        ownerTokenAccount: noAta,
        position: posNo,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bettorNo])
      .rpc();

    const yesAfter = (await getAccount(conn, yesAta)).amount;
    const noAfter = (await getAccount(conn, noAta)).amount;
    const vaultAfter = (await getAccount(conn, vault)).amount;

    // YES winner: staked 100, sole winner -> takes the whole 150 pool.
    assert.equal((yesAfter - yesBefore).toString(), USDC(100).add(USDC(50)).toString());
    assert.equal(yesAfter.toString(), USDC(1050).toString());
    // NO loser: balance unchanged after claiming (payout 0).
    assert.equal(noAfter.toString(), USDC(950).toString());
    // Vault fully drained.
    assert.equal(vaultAfter.toString(), "0");
  });
});
