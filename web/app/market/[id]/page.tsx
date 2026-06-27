import { notFound } from "next/navigation";
import { MarketDetail } from "@/components/MarketDetail";
import { data } from "@/lib/data";

// Market ids are on-chain PDA addresses in chain mode — render on demand.
export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: { id: string } }) {
  const [market, summary] = await Promise.all([
    data.getMarket(params.id),
    data.getPortfolioSummary(),
  ]);

  if (!market) notFound();

  return <MarketDetail market={market} maxBalance={summary.balanceUsdc} />;
}
