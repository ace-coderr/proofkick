"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/format";
import { C, ag } from "@/lib/theme";
import type { SettlementReceipt } from "@/lib/types";

const LEAF_X = [90, 270, 450, 630];

export function Receipt({ receipt }: { receipt: SettlementReceipt }) {
  const [copied, setCopied] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = (id: string, text: string) => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(""), 1400);
  };

  const cpLabel = (id: string) => (copied === id ? "COPIED ✓" : "COPY");
  const cpColor = (id: string) => (copied === id ? C.green : "#5C6880");

  const explorerUrl = `https://explorer.solana.com/tx/${receipt.solana.txSignature}?cluster=${receipt.solana.cluster}`;
  const { merkle } = receipt;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "30px 24px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Link
          href="/"
          className="pk-navlink"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.textDim, fontSize: 13.5 }}
        >
          ← Markets
        </Link>
        <div
          className="mono"
          style={{ fontSize: 11, letterSpacing: ".18em", color: "#5C6880", textTransform: "uppercase" }}
        >
          Settlement Receipt
        </div>
        <Link
          href={`/market/${receipt.marketId}`}
          className="pk-navlink"
          style={{ color: C.textDim, fontSize: 13.5 }}
        >
          View market →
        </Link>
      </div>

      {/* Certificate */}
      <div
        style={{
          position: "relative",
          borderRadius: 24,
          border: "1px solid rgba(47,138,224,.22)",
          background: `radial-gradient(900px 380px at 50% -120px, ${ag(0.12)}, transparent 58%), linear-gradient(180deg,#0F1726,#0B1018)`,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,.03),0 50px 130px -50px rgba(39,117,202,.5),inset 0 1px 0 rgba(255,255,255,.05)",
          overflow: "hidden",
          padding: "44px 44px 36px",
        }}
      >
        {/* textures + corner brackets */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.6,
            background:
              "repeating-linear-gradient(45deg, rgba(47,138,224,.045) 0 1px, transparent 1px 13px), repeating-linear-gradient(-45deg, rgba(25,208,139,.03) 0 1px, transparent 1px 13px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(120% 80% at 50% 18%, transparent 40%, rgba(11,16,24,.6) 100%)",
          }}
        />
        <Bracket pos="tl" />
        <Bracket pos="tr" />
        <Bracket pos="bl" />
        <Bracket pos="br" />

        {/* Seal + headline */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 18 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.green}`, animation: "pk-ring 2.4s ease-out infinite", display: "block" }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.green}`, animation: "pk-ring 2.4s ease-out 1.2s infinite", display: "block" }} />
            <div
              style={{
                position: "relative",
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: `radial-gradient(circle at 50% 35%,#5effc9,${C.green})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 0 6px ${ag(0.12)}, 0 0 44px ${ag(0.5)}`,
                animation: "pk-pop .7s cubic-bezier(.2,1.2,.3,1) both",
              }}
            >
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <path d="M12 24.5l8 8L37 15" stroke="#06251A" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 15px",
              borderRadius: 999,
              background: ag(0.12),
              border: `1px solid ${ag(0.4)}`,
              color: C.green,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".14em",
            }}
          >
            VERIFIED ON-CHAIN
          </div>
          <div
            className="mono"
            style={{ fontSize: 11.5, letterSpacing: ".18em", color: C.textMute, textTransform: "uppercase", marginTop: 22 }}
          >
            Predicate resolved — TRUE
          </div>
          <h1 style={{ margin: "11px 0 0", fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.18 }}>
            {receipt.title.main} <span style={{ color: C.green }}>{receipt.title.op}</span> →{" "}
            <span style={{ color: C.green }}>{receipt.title.outcome}</span>
          </h1>
          <p style={{ margin: "13px 0 0", color: "#9AA6BE", fontSize: 15, maxWidth: 540, lineHeight: 1.55 }}>
            {receipt.fixture.home} <b style={{ color: C.text }}>{receipt.fixture.score}</b> {receipt.fixture.away} · the
            verified match total of <b style={{ color: C.text }}>{receipt.verifiedStat}</b> exceeds the{" "}
            {receipt.lineValue} line. The {receipt.outcome} pool is released in full to {receipt.outcome} holders.
          </p>
        </div>

        {/* Stat tiles */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 26 }}>
          <StatTile label="Verified Stat" value={receipt.verifiedStat} />
          <StatTile label="Predicate Line" value={receipt.predicateLineLabel} />
          <div
            style={{
              border: `1px solid ${ag(0.35)}`,
              borderRadius: 13,
              padding: 15,
              background: ag(0.07),
              textAlign: "center",
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}>
              Outcome
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: C.green }}>{receipt.outcome} ✓</div>
          </div>
        </div>

        {/* Chain attestation */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            marginTop: 24,
            color: "#9AA6BE",
            fontSize: 13.5,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: "linear-gradient(135deg,#3B96E8,#2775CA)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Verified on-chain via <b style={{ color: C.text, fontWeight: 600 }}>TxLINE</b> Merkle proof
        </div>

        {/* Merkle tree */}
        <div style={{ position: "relative", marginTop: 18, borderTop: "1px dashed rgba(255,255,255,.1)", paddingTop: 24 }}>
          <div
            className="mono"
            style={{ textAlign: "center", fontSize: 10.5, letterSpacing: ".16em", color: C.textMute, textTransform: "uppercase", marginBottom: 4 }}
          >
            Merkle Inclusion Proof
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ position: "relative", width: 720, height: 330, margin: "8px auto 0" }}>
              <svg width="720" height="330" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
                <g stroke="rgba(120,140,170,.35)" strokeWidth="1.5" fill="none">
                  <path d="M360 70 L180 130" />
                  <path d="M360 70 L540 130" />
                  <path d="M180 178 L90 246" />
                  <path d="M180 178 L270 246" />
                  <path d="M540 178 L450 246" />
                  <path d="M540 178 L630 246" />
                </g>
                <g stroke={C.green} strokeWidth="1.5" fill="none" strokeDasharray="4 12" opacity="0.85" style={{ animation: "pk-flow 1s linear infinite" }}>
                  <path d="M360 70 L180 130" />
                  <path d="M360 70 L540 130" />
                  <path d="M180 178 L90 246" />
                  <path d="M180 178 L270 246" />
                  <path d="M540 178 L450 246" />
                  <path d="M540 178 L630 246" />
                </g>
              </svg>

              {/* Root */}
              <div
                style={{
                  position: "absolute",
                  left: 360,
                  top: 14,
                  transform: "translateX(-50%)",
                  width: 168,
                  background: `linear-gradient(180deg,${ag(0.1)},#0F1A2C)`,
                  border: `1px solid ${ag(0.55)}`,
                  borderRadius: 12,
                  padding: "10px 13px",
                  boxShadow: `0 0 30px -8px ${ag(0.5)}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: C.green }}>
                    MERKLE ROOT
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 12, color: C.text, marginTop: 4, fontWeight: 600 }}>
                  {merkle.rootShort}
                </div>
              </div>

              {/* Intermediate nodes */}
              {merkle.nodes.map((n, i) => (
                <div
                  key={n.label}
                  style={{
                    position: "absolute",
                    left: i === 0 ? 180 : 540,
                    top: 130,
                    transform: "translateX(-50%)",
                    width: 150,
                    background: "#0F1A2C",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 11,
                    padding: "9px 11px",
                    boxShadow: "0 8px 24px -12px rgba(0,0,0,.7)",
                  }}
                >
                  <div className="mono" style={{ fontSize: 9, letterSpacing: ".08em", color: "#6E7B95" }}>
                    NODE {n.label}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: C.blue, marginTop: 3 }}>
                    {n.hash}
                  </div>
                </div>
              ))}

              {/* Leaves */}
              {merkle.leaves.map((leaf, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: LEAF_X[i],
                    top: 246,
                    transform: "translateX(-50%)",
                    width: 150,
                    background: "#0F1A2C",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 11,
                    padding: "9px 11px",
                    boxShadow: "0 8px 24px -12px rgba(0,0,0,.7)",
                  }}
                >
                  <div className="mono" style={{ fontSize: 8.5, letterSpacing: ".06em", color: "#6E7B95" }}>
                    {leaf.tag}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, margin: "2px 0 4px" }}>{leaf.sub}</div>
                  <div className="mono" style={{ fontSize: 11, color: C.blue }}>
                    {leaf.hash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Proof data (copyable) */}
        <div style={{ position: "relative", marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <CopyCard
            label="Merkle Root"
            value={merkle.root}
            copyLabel={cpLabel("root")}
            copyColor={cpColor("root")}
            onCopy={() => copy("root", merkle.root)}
          />
          <CopyCard
            label="Proof Leaf Hash"
            value={merkle.proofLeaf}
            copyLabel={cpLabel("proof")}
            copyColor={cpColor("proof")}
            onCopy={() => copy("proof", merkle.proofLeaf)}
          />
          <div
            onClick={() => copy("sig", receipt.solana.txSignature)}
            style={{
              gridColumn: "span 2",
              border: "1px solid rgba(47,138,224,.25)",
              borderRadius: 12,
              padding: "13px 15px",
              background: "rgba(47,138,224,.05)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                className="mono"
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 9.5, letterSpacing: ".1em", color: "#8AA9D6", textTransform: "uppercase" }}
              >
                <span style={{ width: 13, height: 13, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,#9945FF,#14F195)", display: "inline-block" }} />
                Solana Transaction Signature
              </span>
              <span className="mono" style={{ fontSize: 10, color: cpColor("sig"), transition: "color .2s" }}>
                {cpLabel("sig")}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "#CFE0F4", marginTop: 6, wordBreak: "break-all", lineHeight: 1.5 }}>
              {receipt.solana.txSignature}
            </div>
          </div>
          <InfoCard label="Slot" value={receipt.solana.slot.toLocaleString("en-US")} />
          <InfoCard label="Settled At" value={receipt.solana.settledAt} />
        </div>

        {/* Footer */}
        <div
          style={{
            position: "relative",
            marginTop: 26,
            borderTop: "1px dashed rgba(255,255,255,.1)",
            paddingTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}>
              Pool Distributed
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {fmtUSD(receipt.pool.amount)}{" "}
              <span style={{ fontSize: 12, color: "#8AA9D6", fontWeight: 500 }}>
                USDC → {receipt.pool.side}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="pk-ghost"
              onClick={() => copy("sig", receipt.solana.txSignature)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "11px 16px",
                borderRadius: 11,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.03)",
                color: "#C5D0E4",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save proof
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pk-explorer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 18px",
                borderRadius: 11,
                background: "linear-gradient(135deg,#3B96E8,#2775CA)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 8px 22px -10px rgba(39,117,202,.8)",
              }}
            >
              View on Solana Explorer ↗
            </a>
          </div>
        </div>

        <div
          className="mono"
          style={{
            position: "relative",
            textAlign: "center",
            marginTop: 24,
            fontSize: 10,
            letterSpacing: ".14em",
            color: "#4A5470",
            textTransform: "uppercase",
          }}
        >
          PROOFKICK · RECEIPT #{receipt.receiptNo} · FIFA WORLD CUP 2026
        </div>
      </div>
    </div>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base: React.CSSProperties = { position: "absolute", width: 18, height: 18 };
  const b = "1.5px solid rgba(255,255,255,.18)";
  const styles: Record<string, React.CSSProperties> = {
    tl: { ...base, top: 16, left: 16, borderLeft: b, borderTop: b },
    tr: { ...base, top: 16, right: 16, borderRight: b, borderTop: b },
    bl: { ...base, bottom: 16, left: 16, borderLeft: b, borderBottom: b },
    br: { ...base, bottom: 16, right: 16, borderRight: b, borderBottom: b },
  };
  return <div style={styles[pos]} />;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.09)",
        borderRadius: 13,
        padding: 15,
        background: "rgba(255,255,255,.02)",
        textAlign: "center",
      }}
    >
      <div className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.09)",
        borderRadius: 12,
        padding: "13px 15px",
        background: "rgba(255,255,255,.02)",
      }}
    >
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 13, color: "#C5D0E4", marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function CopyCard({
  label,
  value,
  copyLabel,
  copyColor,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copyColor: string;
  onCopy: () => void;
}) {
  return (
    <div
      onClick={onCopy}
      style={{
        border: "1px solid rgba(255,255,255,.09)",
        borderRadius: 12,
        padding: "13px 15px",
        background: "rgba(255,255,255,.02)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 10, color: copyColor, transition: "color .2s" }}>
          {copyLabel}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 12, color: "#C5D0E4", marginTop: 6, wordBreak: "break-all", lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}
