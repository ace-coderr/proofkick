import type { DataProvider } from "./provider";
import { MARKETS, TICKER, receiptForMarket } from "./fixtures";

// Mock implementation of the DataProvider contract. Returns Promises so it is
// a drop-in for the eventual network-backed chain provider.
export const mockProvider: DataProvider = {
  async listMarkets() {
    return MARKETS;
  },

  async getMarket(id) {
    return MARKETS.find((m) => m.id === id) ?? null;
  },

  async getReceipt(marketId) {
    return receiptForMarket(marketId);
  },

  async getTicker() {
    return TICKER;
  },

  async getPortfolioSummary() {
    return { balanceUsdc: 1240, wallet: "7xH2…q9Lf" };
  },
};
