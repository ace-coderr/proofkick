# ProofKick — Technical Documentation

**Trustless parametric prediction markets for the FIFA World Cup, settled on Solana via TxLINE Merkle proofs.**

Built by [@_ace_won](https://x.com/_ace_won) for the TxODDS World Cup Track.

- **Live app:** https://proofkick-iota.vercel.app
- **Repo:** https://github.com/ace-coderr/proofkick
- **Settlement program (devnet):** `921ys67mT4rn62pg2ZvfkrNoS581bU6u3QJojtBV71Qm`

---

## Core Idea

Most on-chain prediction markets still settle through a trusted oracle or an admin key — someone, somewhere, decides who won. ProofKick removes that trust assumption entirely.

A ProofKick market is defined by a **predicate over a verifiable match statistic** — for example *"total goals in Brazil vs Argentina > 2.5"* or *"home corners + away corners > 10"*. Users escrow USDC on YES or NO. When the match concludes, **anyone** can submit the TxLINE Merkle proof for the relevant stat, and the settlement program verifies it on-chain by Cross-Program Invocation into TxLINE's `validate_stat` instruction. If the proof checks out and the predicate holds, the escrow is released to the winning side automatically. No oracle to trust, no operator to bribe — settlement is a function of a cryptographic proof anchored on Solana.

The key insight that shaped the whole design: **TxLINE's `validate_stat` is not a generic "who won" oracle — it is a predicate verifier over match stats.** It accepts a threshold, a comparison operator, and optionally a binary expression over two stats. That shape *is* a parametric bet. So rather than build a generic winner market, ProofKick makes each market's settlement condition the very same object that TxLINE verifies. The oracle primitive and the market condition become one.

---

## Architecture

### On-chain settlement program (Anchor / Rust)

The program (`programs/proofkick`) implements a complete escrow-and-settle lifecycle. State is held in three PDAs:

- **`Market`** — seeds `["market", fixture_id_le, market_nonce_le]`. Holds the authority, fixture id, the predicate config (stat A key/period, optional stat B + binary op, comparison, threshold), the USDC mint, the escrow vault, YES/NO pool totals, status (`Open` / `Verified` / `Settled`), and the winning side.
- **`Position`** — seeds `["position", market, owner]`. A user's side and staked amount, plus a claimed flag.
- **`VerifiedOutcome`** — seeds `["outcome", market]`. A receipt PDA recording whether the predicate held and the timestamp it was proven.

Five instructions:

1. **`create_market`** — opens a market over a predicate and creates the USDC escrow vault (a PDA token account).
2. **`place_position`** — transfers USDC into the vault and records a YES/NO `Position`.
3. **`verify_outcome`** — the heart of the system. CPIs into TxLINE's `validate_stat`, reads the returned boolean via `get_return_data`, and writes the `VerifiedOutcome` receipt.
4. **`settle_market`** — reads the receipt and sets the winning side. Cheap; touches no proof data.
5. **`claim`** — pays winners pro-rata from the vault (signed by the market PDA) and zeroes losing positions.

### The two-transaction settlement design

TxLINE's stat proof is a **three-stage Merkle proof** (stat → event subtree → main tree), and verifying it on-chain is compute-heavy — the reference flow raises the compute-unit limit aggressively. A single instruction that both CPIs the full proof *and* moves tokens risks exceeding the per-transaction compute budget once the CPI is nested.

ProofKick deliberately splits this into two transactions:

- **`verify_outcome`** carries the heavy CPI and writes a lightweight `VerifiedOutcome` receipt.
- **`settle_market` / `claim`** are cheap reads of that receipt.

This de-risks the compute budget and, as a bonus, the `VerifiedOutcome` receipt PDA is exactly what the frontend renders as the on-chain settlement receipt.

### CPI bindings

The program uses Anchor's `declare_program!(txoracle)` to generate CPI bindings directly from TxLINE's published devnet IDL (vendored at `idls/txoracle.json`), so the `validate_stat` call is type-checked against the real on-chain interface rather than hand-rolled.

### Frontend (Next.js 14, App Router)

Three routes — Markets dashboard (`/`), Market detail (`/market/[id]`), and the Settlement Receipt hero (`/receipt/[id]`). The receipt visualizes the full **Merkle inclusion proof tree** (root → intermediate nodes → leaf goal/event hashes) alongside the verified stat, predicate, Solana transaction signature, and slot — a screenshot-worthy, traceable record of exactly why a market resolved the way it did.

The data layer is built around a single swappable `DataProvider` interface (`lib/data/`), with a `mock` provider for the prototype and a `chain` provider that reads from the deployed Solana program. Switching from demo data to live on-chain data is a single environment-variable flip with no component changes.

### Testing

The program ships with an end-to-end test suite (`tests/proofkick.ts`) that runs the full lifecycle — create market → place YES/NO positions → `verify_outcome` (real CPI) → settle → claim — against **real on-chain state**. The local validator loads the actual TxLINE program (`txoracle.so`) and the real `daily_scores` Merkle-root account, both dumped from devnet, so the CPI verifies against genuine published roots and the YES side is paid out correctly. All five cases pass.

---

## TxLINE Endpoints & Primitives Used

**Authentication & subscription**
- `POST /auth/guest/start` — obtain a guest JWT (30-day).
- `POST /api/token/activate` — activate a long-lived API token via the wallet's ed25519 signature over `${txSig}:${leagues}:${jwt}`.
- On-chain `subscribe` instruction — free Service Level 1 (World Cup & International Friendlies), no TxL tokens required.

**Scores data & proofs (primary data source)**
- `GET /api/scores/stat-validation` — the core endpoint: returns the three-stage Merkle proof (`statProof`, `subTreeProof`, `mainTreeProof`), the `statToProve`, and the fixture summary for one or two statistics.
- `GET /api/scores/snapshot/{fixtureId}` — fixture score snapshots.
- `GET /api/scores/stream` — real-time scores SSE stream (for the live ticker/odds).

**On-chain validation primitive (the differentiator)**
- TxLINE program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`, instruction **`validate_stat`** — CPI target. Accepts `ts`, `fixture_summary` (`ScoresBatchSummary`), `fixture_proof` and `main_tree_proof` (`Vec<ProofNode>`), a `TraderPredicate` (threshold + comparison), `stat_a` (`StatTerm`), optional `stat_b`, and an optional `BinaryExpression` operator. Verifies against the `daily_scores_merkle_roots` PDA and returns a boolean.

**Devnet endpoints:** API base `https://txline-dev.txodds.com/api/`; guest auth via `https://txline.txodds.com/auth/guest/start`.

---

## Technical Highlights

- A **real on-chain settlement engine** that CPIs into `validate_stat` and releases escrow from a cryptographic proof — not a mock, not an off-chain oracle.
- **Predicate-shaped markets** that map 1:1 onto the TxLINE verification primitive, including two-stat parametric conditions (e.g. corner totals, score differentials).
- A **compute-budget-aware two-tx design** (verify → settle) that keeps the heavy Merkle CPI within Solana's limits.
- **Deterministic, reproducible tests** that verify against real devnet state cloned into a local validator.
- A frontend whose **resolution receipt makes the trustlessness visible** — the Merkle inclusion proof is rendered, not just claimed.
