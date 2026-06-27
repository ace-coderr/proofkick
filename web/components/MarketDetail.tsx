"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import type { Wallet } from "@coral-xyz/anchor";
import { Flag } from "./Flag";
import { fmtUSD, fmtCompact } from "@/lib/format";
import { wobble, liveBump } from "@/lib/odds";
import { teamName } from "@/lib/teams";
import { C, ag } from "@/lib/theme";
import { placePosition } from "@/lib/anchor/actions";
import { CLUSTER } from "@/lib/anchor/program";
import type { Market } from "@/lib/types";

type TxState = { status: "idle" | "pending" | "done" | "error"; sig?: string; err?: string };

export function MarketDetail({ market, maxBalance }: { market: Market; maxBalance: number }) {
  const [tick, setTick] = useState(0);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("100");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const { connection } = useConnection();
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  const live = market.status === "live";
  const settled = market.status === "settled";

  async function handlePlace() {
    if (!connected || !anchorWallet) {
      setVisible(true);
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      setTx({ status: "error", err: "Enter an amount greater than zero." });
      return;
    }
    setTx({ status: "pending" });
    try {
      const sig = await placePosition(connection, anchorWallet as Wallet, {
        market: new PublicKey(market.chain.marketAccount),
        usdcMint: new PublicKey(market.chain.settlementMint),
        side,
        amountUsdc: amt,
      });
      setTx({ status: "done", sig });
    } catch (e) {
      setTx({ status: "error", err: (e as Error).message });
    }
  }

  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => setTick((t) => t + 1), 2200);
    return () => clearInterval(iv);
  }, [live]);

  const yes = wobble(market.yesPct, 0, tick);
  const no = 100 - yes;
  const bump = live ? liveBump(tick) : 0;
  const yesPool = market.pools.yes + bump;
  const noPool = market.pools.no + Math.round(bump * 0.6);

  const isYes = side === "yes";
  const price = (isYes ? yes : no) / 100;
  const amt = parseFloat(amount) || 0;
  const shares = price > 0 ? amt / price : 0;
  const payout = shares;
  const profit = payout - amt;
  const mult = price > 0 ? 1 / price : 0;

  const sc = live ? C.red : settled ? C.green : C.textMute;
  const statusLabel = live ? "LIVE" : settled ? "SETTLED" : "UPCOMING";
  const score = market.score ? `${market.score[0]} - ${market.score[1]}` : "vs";
  const clock = live
    ? `${market.minute}'`
    : settled
      ? "FULL TIME"
      : `${market.kickoffDay} ${market.kickoffTime}`;
  const placeBg = isYes
    ? "linear-gradient(135deg,#3B96E8,#2775CA)"
    : "linear-gradient(135deg,#E8607A,#D2495F)";

  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: "13px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.02)",
    cursor: "pointer",
    textAlign: "center",
    color: C.textDim,
  };
  const yesTab: React.CSSProperties = isYes
    ? { ...tabBase, background: "rgba(47,138,224,.16)", border: "1px solid #2F8AE0", color: C.text, boxShadow: "0 0 0 1px #2F8AE0 inset" }
    : tabBase;
  const noTab: React.CSSProperties = !isYes
    ? { ...tabBase, background: "rgba(232,96,122,.14)", border: "1px solid #E8607A", color: C.text, boxShadow: "0 0 0 1px #E8607A inset" }
    : tabBase;

  const cardBox: React.CSSProperties = {
    background: "#0F1726",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    padding: 22,
  };

  const quickChip = (label: string, val: string) => (
    <span
      key={label}
      className="pk-qchip mono"
      onClick={() => setAmount(val)}
      style={{
        textAlign: "center",
        padding: "8px 0",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,.09)",
        background: "rgba(255,255,255,.02)",
        fontSize: 12,
        color: "#9AA6BE",
        cursor: "pointer",
      }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px 90px" }}>
      <Link
        href="/"
        className="pk-navlink"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: C.textDim,
          fontSize: 13.5,
          cursor: "pointer",
          marginBottom: 18,
        }}
      >
        ← All markets
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 22, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Fixture header */}
          <div
            style={{
              background: "linear-gradient(180deg,#121A2A,#0E1420)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 18,
              padding: 22,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: sc,
                    boxShadow: live ? `0 0 8px ${sc}` : "none",
                    animation: live ? "pk-pulse 1.4s ease-in-out infinite" : "none",
                    display: "inline-block",
                  }}
                />
                <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", color: sc }}>
                  {statusLabel}
                </span>
                <span style={{ color: "#5C6880", fontSize: 13, marginLeft: 4 }}>
                  {market.comp} · {market.venue}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 12, color: C.textMute }}>
                {fmtCompact(yesPool + noPool)} vol
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1 }}>
                <Flag code={market.home} size={46} />
                <span style={{ fontWeight: 600, fontSize: 18 }}>{teamName(market.home)}</span>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div className="mono" style={{ fontWeight: 700, fontSize: 44, letterSpacing: ".04em", lineHeight: 1 }}>
                  {score}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, color: sc, marginTop: 6, letterSpacing: ".1em", fontWeight: 600 }}
                >
                  {clock}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1 }}>
                <Flag code={market.away} size={46} />
                <span style={{ fontWeight: 600, fontSize: 18 }}>{teamName(market.away)}</span>
              </div>
            </div>
          </div>

          {/* Predicate */}
          <div style={cardBox}>
            <div
              className="mono"
              style={{ fontSize: 11, letterSpacing: ".12em", color: C.textMute, textTransform: "uppercase" }}
            >
              Market Predicate
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 23, fontWeight: 600, letterSpacing: "-.015em", lineHeight: 1.35 }}>
              {market.predicate.plain}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,.07)",
                fontSize: 13,
                color: C.textDim,
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: C.blue, display: "inline-block" }} />
                Resolves via <b style={{ color: "#C5D0E4", fontWeight: 600 }}>TxLINE oracle</b>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#3B96E8,#2775CA)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  $
                </span>
                Settles in <b style={{ color: "#C5D0E4", fontWeight: 600 }}>USDC</b>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>Binary outcome · YES / NO</span>
            </div>
          </div>

          {/* Escrowed pool */}
          <div style={cardBox}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: ".12em", color: C.textMute, textTransform: "uppercase" }}
                >
                  Escrowed Pool
                </div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 6, letterSpacing: "-.01em" }}>
                  {fmtUSD(yesPool + noPool)}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "#5C6880", textAlign: "right" }}>
                100% on-chain
                <br />
                non-custodial
              </div>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                background: "#0A1120",
                marginBottom: 12,
              }}
            >
              <div style={{ width: `${yes}%`, height: "100%", background: "linear-gradient(90deg,#2775CA,#3B96E8)" }} />
              <div style={{ width: `${no}%`, height: "100%", background: "#E8607A" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  border: "1px solid rgba(47,138,224,.22)",
                  background: "rgba(47,138,224,.06)",
                  borderRadius: 11,
                  padding: "12px 14px",
                }}
              >
                <div className="mono" style={{ fontSize: 10, letterSpacing: ".08em", color: "#7E94B8" }}>
                  YES POOL · {yes}%
                </div>
                <div className="mono" style={{ fontSize: 17, fontWeight: 600, marginTop: 3, color: "#CFE0F4" }}>
                  {fmtUSD(yesPool)}
                </div>
              </div>
              <div
                style={{
                  border: "1px solid rgba(232,96,122,.22)",
                  background: "rgba(232,96,122,.05)",
                  borderRadius: 11,
                  padding: "12px 14px",
                }}
              >
                <div className="mono" style={{ fontSize: 10, letterSpacing: ".08em", color: "#C58598" }}>
                  NO POOL · {no}%
                </div>
                <div className="mono" style={{ fontSize: 17, fontWeight: 600, marginTop: 3, color: "#F1CAD3" }}>
                  {fmtUSD(noPool)}
                </div>
              </div>
            </div>
          </div>

          {/* On-chain metadata */}
          <div
            style={{
              background: "#0F1726",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 18,
              padding: "6px 22px",
            }}
          >
            {[
              ["Market ID", market.chain.marketAccount.slice(0, 12) + "…" + market.chain.marketAccount.slice(-4)],
              ["Oracle program", market.chain.oracleProgram.slice(0, 16) + "…" + market.chain.oracleProgram.slice(-2)],
              ["Settlement asset", "USDC (SPL)"],
              ["Resolution source", market.chain.resolutionSource],
            ].map(([k, v], i, arr) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: C.textDim }}>{k}</span>
                <span className="mono" style={{ fontSize: 12.5, color: "#C5D0E4" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Position panel */}
        <div
          style={{
            position: "sticky",
            top: 88,
            background: "linear-gradient(180deg,#131C2E,#0E1521)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 24px 60px -36px rgba(0,0,0,.8)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Take a position</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div className="pk-tab" onClick={() => setSide("yes")} style={yesTab}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>YES</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
                {(yes / 100).toFixed(2)} USDC
              </div>
            </div>
            <div className="pk-tab" onClick={() => setSide("no")} style={noTab}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>NO</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>
                {(no / 100).toFixed(2)} USDC
              </div>
            </div>
          </div>

          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: ".08em",
              color: C.textMute,
              textTransform: "uppercase",
              marginBottom: 7,
            }}
          >
            Amount
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 12,
              padding: "12px 14px",
              background: "#0A1120",
              marginBottom: 10,
            }}
          >
            <span className="mono" style={{ fontSize: 20, color: C.textMute }}>
              $
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))}
              inputMode="decimal"
              className="mono"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                color: C.text,
                fontSize: 22,
                fontWeight: 600,
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8AA9D6", letterSpacing: ".04em" }}>USDC</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 18 }}>
            {quickChip("$50", "50")}
            {quickChip("$100", "100")}
            {quickChip("$500", "500")}
            {quickChip("Max", String(maxBalance))}
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.07)",
              paddingTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Row k="Price / share" v={`${price.toFixed(2)} USDC`} />
            <Row k="Payout odds" v={`${mult.toFixed(2)}×`} />
            <Row k="Est. shares" v={shares.toFixed(2)} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                paddingTop: 8,
                borderTop: "1px dashed rgba(255,255,255,.08)",
              }}
            >
              <span style={{ color: C.text, fontWeight: 600 }}>Potential payout</span>
              <span className="mono" style={{ color: C.green, fontWeight: 700 }}>
                ${payout.toFixed(2)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: C.textDim }}>To win</span>
              <span className="mono" style={{ color: C.green }}>
                {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            className="pk-place"
            onClick={handlePlace}
            disabled={tx.status === "pending" || (settled && connected)}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 13,
              border: "none",
              background: settled && connected ? "rgba(255,255,255,.06)" : placeBg,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              textAlign: "center",
              cursor: tx.status === "pending" ? "wait" : "pointer",
              opacity: tx.status === "pending" ? 0.8 : 1,
              boxShadow: "0 10px 26px -12px rgba(39,117,202,.8)",
            }}
          >
            {!connected
              ? "Connect wallet to trade"
              : tx.status === "pending"
                ? "Confirming on devnet…"
                : settled
                  ? "Market settled"
                  : `Buy ${side.toUpperCase()} · ${fmtUSD(amt)}`}
          </button>
          {tx.status === "done" && tx.sig && (
            <a
              href={`https://explorer.solana.com/tx/${tx.sig}?cluster=${CLUSTER}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 10, fontSize: 12, color: C.green, textAlign: "center" }}
            >
              ✓ Position placed — view transaction →
            </a>
          )}
          {tx.status === "error" && (
            <p style={{ margin: "10px 0 0", fontSize: 11.5, color: C.pink, lineHeight: 1.5, textAlign: "center" }}>
              {tx.err}
            </p>
          )}
          <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#5C6880", lineHeight: 1.5, textAlign: "center" }}>
            Funds escrow to a Solana program and release automatically on verified settlement. No custodian.
          </p>
          <Link
            href={`/receipt/${market.id}`}
            className="pk-preview"
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: 11,
              borderRadius: 11,
              border: `1px solid ${ag(0.3)}`,
              background: ag(0.06),
              color: C.green,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Preview settlement receipt →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: C.textDim }}>{k}</span>
      <span className="mono" style={{ color: "#C5D0E4" }}>
        {v}
      </span>
    </div>
  );
}
