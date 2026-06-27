import { notFound } from "next/navigation";
import { Receipt } from "@/components/Receipt";
import { data } from "@/lib/data";

// Receipts are derived from on-chain settlement state — render on demand.
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const receipt = await data.getReceipt(params.id);
  if (!receipt) notFound();
  return <Receipt receipt={receipt} />;
}
