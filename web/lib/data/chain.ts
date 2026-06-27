import type { DataProvider } from "./provider";

// On-chain (Solana devnet) provider — SCAFFOLD.
//
// This is intentionally not wired up yet. It documents exactly where real reads
// go so swapping the data source is a localized change. To activate:
//
//   1. npm i @solana/web3.js @coral-xyz/anchor
//   2. Implement each method below against your deployed TxLINE program.
//   3. Set NEXT_PUBLIC_DATA_SOURCE=chain (and NEXT_PUBLIC_SOLANA_RPC).
//
// Sketch of the intended implementation:
//
//   import { Connection, PublicKey } from "@solana/web3.js";
//   const connection = new Connection(
//     process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com",
//     "confirmed",
//   );
//
//   async listMarkets() {
//     // getProgramAccounts(TXLINE_PROGRAM) → decode each market account,
//     // read the YES/NO escrow token-account balances for the pools, map to Market.
//   }
//   async getReceipt(marketId) {
//     // Load the market's settlement record, fetch the settlement tx + the
//     // TxLINE Merkle inclusion proof, and shape it into SettlementReceipt.
//     // All hashes/signatures are already base58 on Solana.
//   }

const notImplemented = (method: string): never => {
  throw new Error(
    `chainProvider.${method} is not implemented yet. ` +
      `Set NEXT_PUBLIC_DATA_SOURCE=mock or implement lib/data/chain.ts.`,
  );
};

export const chainProvider: DataProvider = {
  listMarkets: () => notImplemented("listMarkets"),
  getMarket: () => notImplemented("getMarket"),
  getReceipt: () => notImplemented("getReceipt"),
  getTicker: () => notImplemented("getTicker"),
  getPortfolioSummary: () => notImplemented("getPortfolioSummary"),
};
