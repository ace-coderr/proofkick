import Link from "next/link";
import type { PortfolioSummary } from "@/lib/types";

export function NavBar({ wallet }: { wallet: PortfolioSummary }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        height: 64,
        borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "rgba(10,14,22,.72)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg,#3B96E8,#2775CA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(47,138,224,.45),0 6px 16px rgba(39,117,202,.4)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="#fff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-.015em" }}>
            Proof<span style={{ color: "#3B96E8" }}>Kick</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 14, fontWeight: 500 }}>
          <Link
            href="/"
            style={{ color: "#EAEEF7", position: "relative", padding: "4px 0" }}
          >
            Markets
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -21,
                height: 2,
                background: "#3B96E8",
                borderRadius: 2,
              }}
            />
          </Link>
          <span className="pk-navlink" style={{ color: "#7E8BA6", cursor: "pointer" }}>
            Portfolio
          </span>
          <span className="pk-navlink" style={{ color: "#7E8BA6", cursor: "pointer" }}>
            Activity
          </span>
          <span className="pk-navlink" style={{ color: "#7E8BA6", cursor: "pointer" }}>
            Docs
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            {wallet.balanceUsdc.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 11, color: "#8AA9D6", fontWeight: 600, letterSpacing: ".04em" }}>
            USDC
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.09)",
            background: "rgba(255,255,255,.02)",
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
          <span className="mono" style={{ fontSize: 13, color: "#C5D0E4" }}>
            {wallet.wallet}
          </span>
        </div>
      </div>
    </div>
  );
}
