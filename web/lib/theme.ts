// Shared palette. Kept tiny and explicit so component style objects can read
// like the original design source.

export const C = {
  bg: "#0A0E16",
  green: "#19D08B",
  blue: "#3B96E8",
  blueDeep: "#2775CA",
  red: "#FF6B7A",
  pink: "#E8607A",
  pinkDeep: "#D2495F",
  text: "#EAEEF7",
  textDim: "#8390A8",
  textMute: "#7E8BA6",
} as const;

/** verification-green at a given alpha. */
export const ag = (a: number) => `rgba(25,208,139,${a})`;
