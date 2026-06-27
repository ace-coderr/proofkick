import type { Metadata } from "next";
import "./globals.css";
import { Ticker } from "@/components/Ticker";
import { NavBar } from "@/components/NavBar";
import { data } from "@/lib/data";

export const metadata: Metadata = {
  title: "ProofKick — Trustless World Cup Markets",
  description:
    "Parametric prediction markets on the 2026 FIFA World Cup — escrowed in USDC, settled trustlessly on Solana via TxLINE Merkle proofs.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ticker, summary] = await Promise.all([
    data.getTicker(),
    data.getPortfolioSummary(),
  ]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Ticker matches={ticker} />
        <NavBar wallet={summary} />
        {children}
      </body>
    </html>
  );
}
