import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

const idl = JSON.parse(fs.readFileSync(__dirname + "/../../idls/txline.json", "utf8"));
const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const coder = new BorshAccountsCoder(idl);

const pda = (s: (Buffer | Uint8Array)[]) => PublicKey.findProgramAddressSync(s, PROGRAM_ID)[0];

(async () => {
  const pm = pda([Buffer.from("pricing_matrix")]);
  const info = await conn.getAccountInfo(pm);
  if (!info) return console.log("pricing_matrix not found");

  // Try decoding against every account type until one fits
  for (const acc of idl.accounts) {
    try {
      const decoded = coder.decode(acc.name, info.data);
      console.log(`Decoded as ${acc.name}:`);
      console.log(JSON.stringify(decoded, (_k, v) =>
        v?.constructor?.name === "PublicKey" ? v.toBase58() :
        typeof v === "bigint" ? v.toString() : v, 2));
      break;
    } catch {}
  }
})();
