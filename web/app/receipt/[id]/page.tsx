import { notFound } from "next/navigation";
import { Receipt } from "@/components/Receipt";
import { data } from "@/lib/data";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const receipt = await data.getReceipt(params.id);
  if (!receipt) notFound();
  return <Receipt receipt={receipt} />;
}

export async function generateStaticParams() {
  const markets = await data.listMarkets();
  return markets.map((m) => ({ id: m.id }));
}
