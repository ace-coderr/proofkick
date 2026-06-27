import Link from "next/link";
import { Flag } from "./Flag";
import { fmtUSD, fmtCompact } from "@/lib/format";
import { wobble, liveBump } from "@/lib/odds";
import { C } from "@/lib/theme";
import type { Market } from "@/lib/types";

/** A single market card. `tick` drives the cosmetic live odds/pool motion. */
export function MarketCard({
  market,
  seed,
  tick,
}: {
  market: Market;
  seed: number;
  tick: number;
}) {
  const live = market.status === "live";
  const settled = market.status === "settled";

  const yes = wobble(market.yesPct, seed, tick);
  const no = 100 - yes;
  const bump = live ? liveBump(tick) : 0;
  const yesPool = market.pools.yes + bump;
  const noPool = market.pools.no + Math.round(bump * 0.6);

  const sc = live ? C.red : settled ? C.green : C.textMute;
  const scBg = live
    ? "rgba(255,107,122,.1)"
    : settled
      ? "rgba(25,208,139,.13)"
      : "rgba(126,139,166,.1)";
  const statusLabel = live ? "LIVE" : settled ? "SETTLED" : "UPCOMING";

  let centerMain: string;
  let centerSub: string;
  if (live && market.score) {
    centerMain = `${market.score[0]} - ${market.score[1]}`;
    centerSub = `${market.minute}'`;
  } else if (settled && market.score) {
    centerMain = `${market.score[0]} - ${market.score[1]}`;
    centerSub = "FULL TIME";
  } else {
    centerMain = market.kickoffTime ?? "";
    centerSub = market.kickoffDay ?? "";
  }

  const footnote = live
    ? `Settles ${market.settlesIn}`
    : settled
      ? `Resolved ${market.result} · ${market.resolvedAgo}`
      : `Kickoff ${market.kickoffDay} ${market.kickoffTime}`;
  const cta = settled ? "View receipt" : "Trade";
  const ctaColor = settled ? C.green : C.blue;
  const href = settled ? `/receipt/${market.id}` : `/market/${market.id}`;

  return (
    <Link href={href}>
      <div
        className="pk-card"
        style={{
          background: "linear-gradient(180deg,#121A2A,#0E1420)",
          border: "1px solid rgba(255,255,255,.07)",
          borderRadius: 16,
          padding: 18,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: sc,
                boxShadow: live ? `0 0 8px ${sc}` : "none",
                animation: live ? "pk-pulse 1.4s ease-in-out infinite" : "none",
                display: "inline-block",
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: sc,
                background: scBg,
                padding: "3px 8px",
                borderRadius: 5,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 12, color: C.textMute }}>
            <span style={{ color: "#C5D0E4", fontWeight: 600 }}>{fmtCompact(yesPool + noPool)}</span> vol
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
            <Flag code={market.home} size={24} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{market.home}</span>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div className="mono" style={{ fontWeight: 700, fontSize: 18, letterSpacing: ".06em" }}>
              {centerMain}
            </div>
            <div
              className="mono"
              style={{ fontSize: 10.5, color: sc, marginTop: 3, letterSpacing: ".1em", fontWeight: 600 }}
            >
              {centerSub}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>{market.away}</span>
            <Flag code={market.away} size={24} />
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,.022)",
            border: "1px solid rgba(255,255,255,.05)",
            borderRadius: 11,
            padding: "12px 13px",
          }}
        >
          <div
            className="mono"
            style={{ fontSize: 10, color: C.textMute, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {market.predicate.label}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4, letterSpacing: "-.01em" }}>
            {market.predicate.line}
          </div>
        </div>

        <div>
          <div
            className="mono"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            <span style={{ color: C.blue, fontWeight: 700 }}>YES {yes}%</span>
            <span style={{ color: C.pink, fontWeight: 700 }}>{no}% NO</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 6,
              overflow: "hidden",
              display: "flex",
              background: "#0A1120",
            }}
          >
            <div
              style={{
                width: `${yes}%`,
                height: "100%",
                background: "linear-gradient(90deg,#2775CA,#3B96E8)",
                transition: "width .6s ease",
              }}
            />
            <div
              style={{ width: `${no}%`, height: "100%", background: "#E8607A", transition: "width .6s ease" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div
            style={{
              border: "1px solid rgba(47,138,224,.22)",
              background: "rgba(47,138,224,.06)",
              borderRadius: 9,
              padding: "9px 11px",
            }}
          >
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "#7E94B8" }}>
              YES POOL
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: "#CFE0F4" }}>
              {fmtUSD(yesPool)}
            </div>
          </div>
          <div
            style={{
              border: "1px solid rgba(232,96,122,.22)",
              background: "rgba(232,96,122,.05)",
              borderRadius: 9,
              padding: "9px 11px",
            }}
          >
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "#C58598" }}>
              NO POOL
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: "#F1CAD3" }}>
              {fmtUSD(noPool)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
          <span style={{ fontSize: 12, color: "#6E7B95" }}>{footnote}</span>
          <span style={{ color: ctaColor, fontWeight: 600, fontSize: 13 }}>{cta} →</span>
        </div>
      </div>
    </Link>
  );
}
