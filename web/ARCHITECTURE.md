# ProofKick — Architecture

A Next.js (App Router) implementation of the ProofKick design: trustless
parametric prediction markets for the FIFA World Cup, settled on Solana via
TxLINE Merkle proofs. Mock data today, structured for a clean swap to real
on-chain reads.

## Screens

| Route             | Screen              | Component                  |
| ----------------- | ------------------- | -------------------------- |
| `/`               | Markets dashboard   | `components/Dashboard`     |
| `/market/[id]`    | Market detail       | `components/MarketDetail`  |
| `/receipt/[id]`   | Settlement receipt  | `components/Receipt`       |

Server components (the `app/**/page.tsx` files + `app/layout.tsx`) fetch data
through the provider and pass plain data into client components, which own the
interactive bits (live odds motion, YES/NO position panel, copy-to-clipboard).

## Data layer — the swap seam

Everything the UI needs comes through one interface:

```
lib/data/
  provider.ts   # DataProvider interface (the contract)
  mock.ts       # mockProvider  — fixtures (active by default)
  chain.ts      # chainProvider — Solana devnet scaffold (throws until wired)
  index.ts      # picks provider from NEXT_PUBLIC_DATA_SOURCE
  fixtures.ts   # mock markets, ticker, receipts
```

`DataProvider` methods are all `async` because on-chain reads are network calls.
To go live:

1. `npm i @solana/web3.js @coral-xyz/anchor`
2. Implement the methods in `lib/data/chain.ts` against the deployed TxLINE
   program (decode market PDAs, read YES/NO escrow token balances, fetch the
   settlement tx + Merkle inclusion proof).
3. Set `NEXT_PUBLIC_DATA_SOURCE=chain`.

No component changes are required — the UI only ever imports `data` from
`@/lib/data`.

## Hashes

All hashes, addresses, and signatures are **Solana base58** — never `0x` hex.
`lib/hash.ts` provides `base58(seed, len)` (deterministic, plausible mock
values), `shorten()`, and `isBase58()`. The on-chain provider replaces the
generated strings with genuine values from the program + RPC.

## Deploy (Vercel)

Zero-config: import the repo, framework auto-detected as Next.js. Set the env
vars from `.env.example` in the Vercel project. Pages are statically generated
where possible (`generateStaticParams` enumerates the mock market ids); switch
to dynamic rendering once `chainProvider` does live RPC reads.

## Local dev

```
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```
