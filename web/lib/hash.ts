// Solana base58 helpers.
//
// Solana addresses, signatures, and (in ProofKick) Merkle hashes are all encoded
// as base58 — never 0x-prefixed hex. The mock data layer uses `base58(seed, len)`
// to mint *plausible, deterministic* values so the UI looks real; when the
// on-chain provider lands, these strings are replaced by genuine account
// addresses / tx signatures / proof hashes pulled from the program + RPC.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; // Bitcoin/Solana base58

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic base58 string of `len` chars derived from `seed`. */
export function base58(seed: string, len: number): string {
  const rnd = mulberry32(fnv1a(seed));
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return out;
}

/** Truncate a long base58 string for compact display: "9fXk…AoZr". */
export const shorten = (s: string, head = 4, tail = 4) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

/** True if every char is in the base58 alphabet (no 0x / hex). */
export const isBase58 = (s: string) => s.length > 0 && [...s].every((c) => ALPHABET.includes(c));
