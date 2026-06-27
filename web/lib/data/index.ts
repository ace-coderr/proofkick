import type { DataProvider } from "./provider";
import { mockProvider } from "./mock";
import { chainProvider } from "./chain";

// Active data source. Defaults to mock; flip to the on-chain provider with
// NEXT_PUBLIC_DATA_SOURCE=chain once lib/data/chain.ts is implemented.
const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

export const data: DataProvider = source === "chain" ? chainProvider : mockProvider;

export type { DataProvider } from "./provider";
