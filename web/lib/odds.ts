// Cosmetic live-motion helpers. These drive the "odds tick" / "pool grows"
// animation on the dashboard and detail screens — purely a client-side visual
// shimmer layered on top of the real base figures from the data layer.

/** Wobble a base percentage deterministically by tick, clamped to [6, 94]. */
export const wobble = (base: number, seed: number, tick: number) =>
  Math.max(6, Math.min(94, base + Math.round(2.2 * Math.sin(tick * 0.6 + seed * 1.7))));

/** Monotonic pool bump for live markets. */
export const liveBump = (tick: number) => tick * 37;
