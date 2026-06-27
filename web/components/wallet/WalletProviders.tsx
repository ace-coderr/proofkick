"use client";

import { Buffer } from "buffer";
import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";

// Solana web3/anchor expect a global Buffer in the browser (PDA seeds, tx
// serialization). Next doesn't polyfill it for the client, so do it here.
if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
import {
  ConnectionProvider as RawConnectionProvider,
  WalletProvider as RawWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as RawWalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { RPC_URL } from "@/lib/anchor/program";
import "@solana/wallet-adapter-react-ui/styles.css";

// The wallet-adapter packages nest @types/react@19, which clashes with the app's
// React 18 JSX types. The providers are runtime-correct; cast them to plain
// component types so the type-checker stops at the React-18/19 .d.ts boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ConnectionProvider = RawConnectionProvider as ComponentType<{ endpoint: string; children: ReactNode }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WalletProvider = RawWalletProvider as ComponentType<{ wallets: any[]; autoConnect?: boolean; children: ReactNode }>;
const WalletModalProvider = RawWalletModalProvider as ComponentType<{ children: ReactNode }>;

// Client-only wallet context for the whole app. Phantom on devnet.
export function WalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
