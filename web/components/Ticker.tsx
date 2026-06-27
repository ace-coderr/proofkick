import type { TickerMatch } from "@/lib/types";

/** Live World Cup score ticker that scrolls across the top. The list is doubled
 *  so the CSS marquee loops seamlessly. */
export function Ticker({ matches }: { matches: TickerMatch[] }) {
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
          style={{
            fontWeight: 700,
            letterSpacing: ".14em",
            color: "#FF6B7A",
            fontSize: 10.5,
          }}
        >
          LIVE
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
