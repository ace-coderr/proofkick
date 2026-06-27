import { C } from "@/lib/theme";
import { PROGRAM_ID, TXORACLE_PROGRAM_ID, CLUSTER } from "@/lib/anchor/program";

export const metadata = { title: "Docs — ProofKick" };

const REPO = "https://github.com/ace-coderr/proofkick";

export default function DocsPage() {
  const programId = PROGRAM_ID.toBase58();
  const explorer = `https://explorer.solana.com/address/${programId}?cluster=${CLUSTER}`;
  const txoracleExplorer = `https://explorer.solana.com/address/${TXORACLE_PROGRAM_ID.toBase58()}?cluster=${CLUSTER}`;

  const card: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: "18px 20px",
    background: "linear-gradient(180deg,rgba(255,255,255,.018),transparent)",
  };

  const links: { title: string; desc: string; href: string }[] = [
    { title: "GitHub repository", desc: "Full source: Anchor program, tracer, and this web app.", href: REPO },
    { title: "TECHNICAL.md", desc: "Architecture, PDAs, and the settlement / proof flow.", href: `${REPO}/blob/main/TECHNICAL.md` },
    { title: "Settlement program (explorer)", desc: `ProofKick program on Solana ${CLUSTER}.`, href: explorer },
    { title: "TxLINE oracle program (explorer)", desc: "The txoracle program the CPI validates proofs against.", href: txoracleExplorer },
  ];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "34px 28px 90px" }}>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.025em" }}>Docs</h1>
      <p style={{ margin: "7px 0 24px", color: C.textDim, fontSize: 14, lineHeight: 1.6 }}>
        ProofKick is a set of trustless parametric prediction markets on the 2026 FIFA World Cup.
        Users escrow USDC on a YES/NO predicate over a verifiable match statistic; settlement is a
        function of a TxLINE Merkle proof verified on-chain via CPI — no oracle operator to trust.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {links.map((l) => (
          <a key={l.title} href={l.href} target="_blank" rel="noreferrer">
            <div
              className="pk-card"
              style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{l.title}</div>
                <div style={{ fontSize: 13, color: C.textDim, marginTop: 3 }}>{l.desc}</div>
              </div>
              <span style={{ color: C.blue, fontWeight: 600, fontSize: 18 }}>→</span>
            </div>
          </a>
        ))}
      </div>

      <div style={card}>
        <div
          className="mono"
          style={{ fontSize: 10.5, letterSpacing: ".1em", color: C.textMute, textTransform: "uppercase", marginBottom: 12 }}
        >
          On-chain coordinates
        </div>
        {[
          ["Cluster", CLUSTER],
          ["ProofKick program", programId],
          ["TxLINE oracle program", TXORACLE_PROGRAM_ID.toBase58()],
        ].map(([k, v], i, arr) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "11px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
            }}
          >
            <span style={{ fontSize: 13, color: C.textDim }}>{k}</span>
            <span className="mono" style={{ fontSize: 12.5, color: "#C5D0E4", wordBreak: "break-all", textAlign: "right" }}>
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
