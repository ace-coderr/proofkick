import type {
  Market,
  PortfolioSummary,
  SettlementReceipt,
  TickerMatch,
} from "@/lib/types";

// The single seam between the UI and "where the data comes from".
//
// Today this is satisfied by `mockProvider`. To go on-chain you implement the
// same interface in `chain.ts` (read market PDAs via @solana/web3.js, decode
// pool balances from the program's token accounts, fetch the settlement tx +
// Merkle proof) and flip NEXT_PUBLIC_DATA_SOURCE=chain — no UI changes required.
//
// Every method is async on purpose: on-chain reads are network calls.
export interface DataProvider {
  listMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | null>;
  getReceipt(marketId: string): Promise<SettlementReceipt | null>;
  getTicker(): Promise<TickerMatch[]>;
  getPortfolioSummary(): Promise<PortfolioSummary>;
}
