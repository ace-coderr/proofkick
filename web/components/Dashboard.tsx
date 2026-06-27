"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "./MarketCard";
import { C, ag } from "@/lib/theme";
import type { Market } from "@/lib/types";

const FILTERS = ["All", "Live", "Goals", "Corners", "Settled"];

const STATS = [
  { label: "Total Value Locked", value: "$4.82M", accent: false },
  { label: "24h Volume", value: "$1.36M", accent: false },
  { label: "Open Markets", value: "128", accent: false },
  { label: "Proofs Verified (24h)", value: "342", accent: true },
];

export function Dashboard({ markets }: { markets: Market[] }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "34px 28px 90px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.025em" }}>
            Open Markets
          </h1>
          <p style={{ margin: "7px 0 0", color: C.textDim, fontSize: 14, maxWidth: 560 }}>
            Parametric prediction markets on the 2026 FIFA World Cup — escrowed in USDC, settled
            trustlessly on Solana via TxLINE Merkle proofs.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f, i) => (
            <span
              key={f}
              style={{
                padding: "8px 14px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: i === 0 ? 600 : 500,
                background: i === 0 ? "rgba(47,138,224,.16)" : "rgba(255,255,255,.02)",
                border: i === 0 ? "1px solid rgba(47,138,224,.4)" : "1px solid rgba(255,255,255,.08)",
                color: i === 0 ? C.text : "#9AA6BE",
                cursor: "pointer",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 26 }}>
        {STATS.map((s) => (
          <div
            key={s.label}
            style={{
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "16px 18px",
              background: s.accent
                ? `linear-gradient(180deg,${ag(0.05)},transparent)`
                : "linear-gradient(180deg,rgba(255,255,255,.018),transparent)",
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 10.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                marginTop: 7,
                letterSpacing: "-.02em",
                color: s.accent ? C.green : C.text,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {markets.map((m, i) => (
          <MarketCard key={m.id} market={m} seed={i} tick={tick} />
        ))}
      </div>
    </div>
  );
}
