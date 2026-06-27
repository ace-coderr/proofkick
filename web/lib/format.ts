// Display formatters.

export const fmtUSD = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export const fmtCompact = (n: number) =>
  n >= 1e6
    ? "$" + (n / 1e6).toFixed(2) + "M"
    : n >= 1e3
      ? "$" + (n / 1e3).toFixed(1) + "K"
      : "$" + Math.round(n);

export const fmtInt = (n: number) => n.toLocaleString("en-US");
