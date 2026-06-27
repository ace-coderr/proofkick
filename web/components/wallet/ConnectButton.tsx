"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT;

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

export function ConnectButton() {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [usdc, setUsdc] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicKey || !USDC_MINT) {
        setUsdc(null);
        return;
      }
      try {
        const ata = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), publicKey, false, TOKEN_PROGRAM_ID);
        const bal = await connection.getTokenAccountBalance(ata);
        if (!cancelled) setUsdc(bal.value.uiAmount ?? 0);
      } catch {
        if (!cancelled) setUsdc(0);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          borderRadius: 10,
          border: "1px solid rgba(47,138,224,.45)",
          background: "linear-gradient(135deg,#3B96E8,#2775CA)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {usdc !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(47,138,224,.28)",
            background: "rgba(47,138,224,.08)",
          }}
        >
          <span
            style={{
              width: 17,
              height: 17,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#3B96E8,#2775CA)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            $
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
            {usdc.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 11, color: "#8AA9D6", fontWeight: 600, letterSpacing: ".04em" }}>USDC</span>
        </div>
      )}
      <button
        onClick={() => disconnect()}
        title="Click to disconnect"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.09)",
          background: "rgba(255,255,255,.02)",
          color: "#C5D0E4",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#19D08B",
            boxShadow: "0 0 8px #19D08B",
            display: "inline-block",
          }}
        />
        <span className="mono" style={{ fontSize: 13 }}>
          {short(publicKey.toBase58())}
        </span>
      </button>
    </div>
  );
}
