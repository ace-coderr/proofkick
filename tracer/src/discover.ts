import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");

function pda(seeds: (Buffer | Uint8Array)[]) {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

(async () => {
  const pricingMatrix = pda([Buffer.from("pricing_matrix")]);
  const tokenTreasuryPda = pda([Buffer.from("token_treasury_v2")]);
  const usdtTreasuryPda = pda([Buffer.from("usdt_treasury")]);

  console.log("pricing_matrix     :", pricingMatrix.toBase58());
  console.log("token_treasury_v2  :", tokenTreasuryPda.toBase58());
  console.log("usdt_treasury      :", usdtTreasuryPda.toBase58());

  for (const [label, key] of [
    ["pricing_matrix", pricingMatrix],
    ["token_treasury_v2", tokenTreasuryPda],
  ] as [string, PublicKey][]) {
    const info = await conn.getAccountInfo(key);
    console.log(`\n--- ${label} account ---`);
    if (!info) { console.log("  (not found on devnet)"); continue; }
    console.log("  owner:", info.owner.toBase58(), "| dataLen:", info.data.length);
    // scan the raw account data for any embedded 32-byte pubkeys (mint lives here)
    const seen = new Set<string>();
    for (let i = 8; i + 32 <= info.data.length; i += 1) {
      const slice = info.data.subarray(i, i + 32);
      // heuristic: skip all-zero
      if (slice.every((b) => b === 0)) continue;
      try {
        const pk = new PublicKey(slice).toBase58();
        if (pk.length >= 32 && !seen.has(pk)) { seen.add(pk); }
      } catch {}
    }
    console.log("  embedded pubkey candidates:", [...seen].slice(0, 12));
  }
})();
