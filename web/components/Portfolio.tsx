"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import type { Wallet } from "@coral-xyz/anchor";
import { claim, fetchPositionsForOwner, fetchMarket, type Side } from "@/lib/anchor/actions";
import { CLUSTER } from "@/lib/anchor/program";
import { displayTeams, sideToResult, statusToUi, usdc, comparisonWord } from "@/lib/anchor/map";
import { C } from "@/lib/theme";
import { fmtUSD } from "@/lib/format";
import { Flag } from "./Flag";

interface Row {
  market: string;
  usdcMint: string;
  home: string;
  away: string;
  line: string;
  side: Side;
  amount: number;
  claimed: boolean;
  status: "live" | "upcoming" | "settled";
  winning?: "YES" | "NO";
  claimable: number; // 0 unless settled winner & unclaimed
}

export function Portfolio() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const positions = await fetchPositionsForOwner(connection, publicKey);
      const out: Row[] = [];
      for (const p of positions) {
        const m = await fetchMarket(connection, p.market);
        const { home, away } = displayTeams(p.market.toBase58());
        const cmp = comparisonWord(m.comparison);
        const status = statusToUi(m.status);
        const winning = sideToResult(m.winningSide);
        const amount = usdc(p.amount);
        const sideUpper = p.side === "yes" ? "YES" : "NO";

        let claimable = 0;
        if (status === "settled" && winning === sideUpper && !p.claimed) {
          const totalPool = usdc(m.totalYes) + usdc(m.totalNo);
          const winningTotal = winning === "YES" ? usdc(m.totalYes) : usdc(m.totalNo);
          claimable = winningTotal > 0 ? (amount * totalPool) / winningTotal : 0;
        }

        out.push({
          market: p.market.toBase58(),
          usdcMint: m.usdcMint.toBase58(),
          home,
          away,
          line: `${cmp.word} ${m.threshold}`,
          side: p.side,
          amount,
          claimed: p.claimed,
          status,
          winning,
          claimable,
        });
      }
      setRows(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) load();
    else setRows([]);
  }, [connected, publicKey, load]);

  async function handleClaim(r: Row) {
    if (!anchorWallet) return;
    setClaiming(r.market);
    setError(null);
    try {
      await claim(connection, anchorWallet as Wallet, {
        market: new PublicKey(r.market),
        usdcMint: new PublicKey(r.usdcMint),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(null);
    }
  }

  const totalStaked = rows.reduce((s, r) => s + r.amount, 0);
  const totalClaimable = rows.reduce((s, r) => s + r.claimable, 0);

  const card: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: "16px 18px",
    background: "linear-gradient(180deg,rgba(255,255,255,.018),transparent)",
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 28px 90px" }}>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.025em" }}>Portfolio</h1>
      <p style={{ margin: "7px 0 24px", color: C.textDim, fontSize: 14 }}>
        Your open positions and claimable winnings on devnet.
      </p>

      {!connected ? (
        <div style={{ ...card, textAlign: "center", padding: "48px 18px" }}>
          <p style={{ color: C.textDim, marginBottom: 18 }}>Connect your wallet to view positions.</p>
          <button
            onClick={() => setVisible(true)}
            style={{
              padding: "11px 20px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(135deg,#3B96E8,#2775CA)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            <Stat label="Open Positions" value={String(rows.filter((r) => r.status !== "settled").length)} />
            <Stat label="Total Staked" value={fmtUSD(totalStaked)} />
            <Stat label="Claimable" value={fmtUSD(totalClaimable)} accent />
          </div>

          {loading && <p style={{ color: C.textDim }}>Loading positions…</p>}
          {error && <p style={{ color: C.pink, fontSize: 13 }}>{error}</p>}
          {!loading && rows.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.textDim }}>
              No positions yet.{" "}
              <Link href="/" style={{ color: C.blue }}>
                Browse markets →
              </Link>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((r) => (
              <div
                key={r.market}
                style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <Flag code={r.home} size={26} />
                  <Flag code={r.away} size={26} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {r.home} vs {r.away}
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>
                      {r.line} · {r.side.toUpperCase()} · {fmtUSD(r.amount)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      padding: "4px 9px",
                      borderRadius: 6,
                      color: r.status === "settled" ? C.green : C.red,
                      background: r.status === "settled" ? "rgba(25,208,139,.12)" : "rgba(255,107,122,.1)",
                    }}
                  >
                    {r.status === "settled" ? `SETTLED · ${r.winning ?? "—"}` : "OPEN"}
                  </span>

                  {r.claimed ? (
                    <span style={{ fontSize: 13, color: C.textMute }}>Claimed</span>
                  ) : r.claimable > 0 ? (
                    <button
                      onClick={() => handleClaim(r)}
                      disabled={claiming === r.market}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(135deg,#19D08B,#11A06C)",
                        color: "#04130D",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: claiming === r.market ? "wait" : "pointer",
                      }}
                    >
                      {claiming === r.market ? "Claiming…" : `Claim ${fmtUSD(r.claimable)}`}
                    </button>
                  ) : r.status === "settled" ? (
                    <span style={{ fontSize: 13, color: C.textMute }}>No winnings</span>
                  ) : (
                    <Link href={`/market/${r.market}`} style={{ fontSize: 13, color: C.blue }}>
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 22, fontSize: 12, color: "#5C6880", textAlign: "center" }}>
            Connected to Solana {CLUSTER}. Claims release escrow pro-rata to the winning side.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 13,
        padding: "16px 18px",
        background: accent
          ? "linear-gradient(180deg,rgba(25,208,139,.06),transparent)"
          : "linear-gradient(180deg,rgba(255,255,255,.018),transparent)",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 10.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase" }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: 24, fontWeight: 700, marginTop: 7, letterSpacing: "-.02em", color: accent ? C.green : C.text }}
      >
        {value}
      </div>
    </div>
  );
}
