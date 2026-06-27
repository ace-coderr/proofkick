"use client";

import { useEffect, useState } from "react";
import type { TickerMatch } from "@/lib/types";

/** Live World Cup score ticker that scrolls across the top. The list is doubled
 *  so the CSS marquee loops seamlessly. Initial rows are server-rendered; the
 *  client then polls /api/ticker which proxies the authenticated TxLINE SSE
 *  stream (falling back to mock when unauthenticated). */
export function Ticker({ matches: initial }: { matches: TickerMatch[] }) {
  const [matches, setMatches] = useState<TickerMatch[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/ticker", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.matches) && data.matches.length) {
          setMatches(data.matches);
          setLive(Boolean(data.live));
        }
      } catch {
        /* keep last good rows */
      }
    }
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const loop = [...matches, ...matches];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 38,
        background: "#0B0F1A",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        fontSize: 12.5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "0 15px",
          height: "100%",
          borderRight: "1px solid rgba(255,255,255,.06)",
          background: "rgba(255,107,122,.05)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#FF6B7A",
            animation: "pk-pulse 1.4s ease-in-out infinite",
            display: "inline-block",
          }}
        />
        <span
          className="mono"
          title={live ? "Live TxLINE feed" : "Demo data — no live TxLINE feed"}
          style={{
            fontWeight: 700,
            letterSpacing: ".14em",
            color: live ? "#FF6B7A" : "#7E8BA6",
            fontSize: 10.5,
          }}
        >
          {live ? "LIVE" : "DEMO"}
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "max-content",
            height: "100%",
            animation: "pk-marquee 42s linear infinite",
          }}
        >
          {loop.map((t, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0 22px",
                height: 38,
                borderRight: "1px solid rgba(255,255,255,.05)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontWeight: 600, color: "#C5D0E4", letterSpacing: ".04em" }}>
                {t.home}
              </span>
              <span className="mono" style={{ fontWeight: 700, color: "#EAEEF7" }}>
                {t.score}
              </span>
              <span style={{ fontWeight: 600, color: "#C5D0E4", letterSpacing: ".04em" }}>
                {t.away}
              </span>
              <span className="mono" style={{ color: "#5C6880", fontSize: 11 }}>
                {t.min}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
