import { Dashboard } from "@/components/Dashboard";
import { data } from "@/lib/data";

// Always reflect the latest on-chain markets (chain mode) / mock list.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const markets = await data.listMarkets();
  return <Dashboard markets={markets} />;
}
