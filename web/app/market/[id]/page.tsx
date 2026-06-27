import { notFound } from "next/navigation";
import { MarketDetail } from "@/components/MarketDetail";
import { data } from "@/lib/data";

export default async function MarketPage({ params }: { params: { id: string } }) {
  const [market, summary] = await Promise.all([
    data.getMarket(params.id),
    data.getPortfolioSummary(),
  ]);

  if (!market) notFound();

  return <MarketDetail market={market} maxBalance={summary.balanceUsdc} />;
}

export async function generateStaticParams() {
  const markets = await data.listMarkets();
  return markets.map((m) => ({ id: m.id }));
}
