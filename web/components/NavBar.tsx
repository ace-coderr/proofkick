import Link from "next/link";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export function NavBar() {
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
          <Link href="/portfolio" className="pk-navlink" style={{ color: "#7E8BA6" }}>
            Portfolio
          </Link>
          <Link href="/activity" className="pk-navlink" style={{ color: "#7E8BA6" }}>
            Activity
          </Link>
          <Link href="/docs" className="pk-navlink" style={{ color: "#7E8BA6" }}>
            Docs
          </Link>
        </div>
      </div>
      <ConnectButton />
    </div>
  );
}
