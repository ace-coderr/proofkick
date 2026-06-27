// Server-only: read the live TxLINE Server-Sent Events scores stream and reduce
// it to a ticker snapshot. Mirrors the streaming sample in
// docs-ref/onchain-validation.md ("Real-Time Scores Streaming").
import type { TickerMatch } from "@/lib/types";
import { fixtureTeams } from "@/lib/anchor/map";
import { getCredentials } from "./auth";

// Pull a few seconds of the stream, accumulate the latest state per fixture,
// then map to the ticker. Returns null when unauthenticated or no live data.
export async function fetchLiveTicker(windowMs = 4000): Promise<TickerMatch[] | null> {
  const creds = await getCredentials();
  if (!creds) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), windowMs);

  try {
    const res = await fetch(`${creds.api}/api/scores/stream`, {
      headers: {
        Authorization: `Bearer ${creds.jwt}`,
        "X-Api-Token": creds.apiToken,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const byFixture = new Map<number, TickerMatch>();
    let buf = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
          const m = parseScoreEvent(payload);
          if (m) byFixture.set(m.fixtureId, m.ticker);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const matches = [...byFixture.values()];
    return matches.length ? matches : null;
  } catch {
    // Aborted (window elapsed) or network error: use whatever we don't have.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort decode of a single stream event into a ticker row. The exact
// payload shape varies; we probe the common field names.
function parseScoreEvent(payload: string): { fixtureId: number; ticker: TickerMatch } | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(payload);
  } catch {
    return null;
  }

  const fixtureId = num(obj, ["fixtureId", "fixture_id", "fixtureID", "id"]);
  if (fixtureId == null) return null;

  const home = num(obj, ["homeScore", "home_score", "scoreHome", "home"]);
  const away = num(obj, ["awayScore", "away_score", "scoreAway", "away"]);
  const minute = num(obj, ["minute", "min", "elapsed", "clock"]);

  const teams = fixtureTeams(fixtureId);
  const score = home != null && away != null ? `${home} - ${away}` : "— · —";
  const min = minute != null ? `${minute}'` : "LIVE";

  return { fixtureId, ticker: { home: teams.home, score, away: teams.away, min } };
}

function num(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}
