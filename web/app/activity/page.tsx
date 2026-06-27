import Link from "next/link";
import { data } from "@/lib/data";
import { Flag } from "@/components/Flag";
import { C } from "@/lib/theme";
import { fmtUSD } from "@/lib/format";

export const metadata = { title: "Activity — ProofKick" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const markets = await data.listMarkets();
  const settled = markets.filter((m) => m.status === "settled");

  const card: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: "16px 18px",
    background: "linear-gradient(180deg,rgba(255,255,255,.018),transparent)",
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 28px 90px" }}>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.025em" }}>Activity</h1>
      <p style={{ margin: "7px 0 24px", color: C.textDim, fontSize: 14 }}>
        Recent market settlements. Each links to its on-chain settlement receipt and TxLINE Merkle proof.
      </p>

      {settled.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 18px", color: C.textDim }}>
          No settled markets yet.{" "}
          <Link href="/" style={{ color: C.blue }}>
            Browse open markets →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {settled.map((m) => (
            <Link key={m.id} href={`/receipt/${m.id}`}>
              <div
                className="pk-card"
                style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <Flag code={m.home} size={26} />
                  <Flag code={m.away} size={26} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {m.home} vs {m.away}
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>
                      {m.predicate.line}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="mono" style={{ fontSize: 12.5, color: "#C5D0E4", textAlign: "right" }}>
                    {fmtUSD(m.pools.yes + m.pools.no)} pool
                    <div style={{ fontSize: 11, color: "#5C6880", marginTop: 2 }}>{m.resolvedAgo}</div>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      padding: "4px 9px",
                      borderRadius: 6,
                      color: C.green,
                      background: "rgba(25,208,139,.12)",
                    }}
                  >
                    {m.result ?? "SETTLED"}
                  </span>
                  <span style={{ color: C.green, fontWeight: 600, fontSize: 13 }}>Receipt →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
