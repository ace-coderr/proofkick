import { teamColor } from "@/lib/teams";
import type { TeamCode } from "@/lib/types";

/** Country-coded chip used in place of a flag image, matching the design. */
export function Flag({ code, size }: { code: TeamCode; size: number }) {
  const br = Math.round(size / 3.4);
  const sh = Math.round(size / 4);
  const sv = Math.round(size / 2.5);
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: br,
        background: teamColor(code),
        boxShadow: `inset 0 0 0 1px rgba(0,0,0,.3), inset 0 -${sh}px ${sv}px rgba(0,0,0,.28)`,
        flexShrink: 0,
      }}
    />
  );
}
