import type { TeamCode } from "./types";

// Country-coded chip colors + full names. The "flag" is a color-coded rounded
// chip (see components/Flag.tsx) rather than an emoji/image, matching the design.

export const TEAM_COLORS: Record<TeamCode, string> = {
  BRA: "#F2C14E",
  ARG: "#5FA8D3",
  FRA: "#3B6FD4",
  ESP: "#D14B4B",
  ENG: "#D8DEE9",
  GER: "#E0A93B",
  POR: "#1FA463",
  NED: "#EE7A36",
  MEX: "#1E9B5A",
  USA: "#3B6FD4",
  ITA: "#3B7BD4",
  BEL: "#E0A93B",
  CRO: "#D14B4B",
  URU: "#5FA8D3",
};

export const TEAM_NAMES: Record<TeamCode, string> = {
  BRA: "Brazil",
  ARG: "Argentina",
  FRA: "France",
  ESP: "Spain",
  ENG: "England",
  GER: "Germany",
  POR: "Portugal",
  NED: "Netherlands",
};

export const teamName = (code: TeamCode) => TEAM_NAMES[code] ?? code;
export const teamColor = (code: TeamCode) => TEAM_COLORS[code] ?? "#888";
