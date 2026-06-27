import { NextResponse } from "next/server";
import { TICKER } from "@/lib/data/fixtures";
import { fetchLiveTicker } from "@/lib/txline/scores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Live World Cup score ticker. Proxies the authenticated TxLINE SSE stream
// server-side and falls back to the mock list when unauthenticated / no live
// matches. `live: true` means the rows came from the real feed.
export async function GET() {
  try {
    const live = await fetchLiveTicker();
    if (live && live.length) {
      return NextResponse.json({ matches: live, live: true });
    }
  } catch (e) {
    console.error("[api/ticker] live fetch failed:", (e as Error).message);
  }
  return NextResponse.json({ matches: TICKER, live: false });
}
