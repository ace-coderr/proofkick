import { Dashboard } from "@/components/Dashboard";
import { data } from "@/lib/data";

export default async function DashboardPage() {
  const markets = await data.listMarkets();
  return <Dashboard markets={markets} />;
}
