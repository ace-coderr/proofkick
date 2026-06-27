# ProofKick — TxLINE API Feedback

Submitted by [@_ace_won](https://x.com/_ace_won) for the TxODDS World Cup Track.

This is honest, build-it-yourself feedback from implementing a real on-chain settlement engine that CPIs into `validate_stat`. Overall the data layer is excellent and the cryptographic primitive is genuinely well-designed — most of the friction was in onboarding and documentation gaps around the on-chain subscription flow, not in the core verification.

## What worked best

- **`validate_stat` as a predicate verifier is the standout primitive.** Accepting a threshold, a comparison, and an optional binary expression over two stats means it isn't just a "did the proof match" check — it *is* a parametric condition evaluator. That shape maps perfectly onto prediction-market and prop-bet logic. It made the whole "settle a market from a proof" idea fall out naturally instead of having to be bolted on.
- **The IDL is published on-chain.** Being able to `anchor idl fetch` the program's IDL straight from devnet gave an authoritative interface with zero transcription risk, and let `declare_program!` generate CPI bindings cleanly. This is the right way to ship a CPI target.
- **The three-stage Merkle proof structure is clean and the `stat-validation` endpoint returns ready-to-pass data.** The proof nodes (`hash` + `isRightSibling`) deserialized directly into the on-chain `ProofNode` type with no reshaping. That's a well-thought-out schema.
- **Real on-chain state is cloneable for testing.** Dumping the program `.so` and the `daily_scores` root account from devnet and loading them into a local validator made it possible to test the full CPI deterministically against genuine roots. This is a huge win for confidence and reproducibility.
- **The free World Cup tier is genuinely free.** The pricing matrix row for Service Level 1 is zero-cost, exactly as advertised — no TxL purchase needed to build.

## Friction points (where time was lost)

1. **The on-chain `subscribe` accounts aren't documented for devnet.** The docs describe the subscribe flow, but the actual devnet **subscription token mint, treasury PDA seed, and treasury vault** aren't listed. We had to inspect a real on-chain `subscribe` transaction to reverse-engineer the account layout (mint `4Zao8oc…`, Token-2022; treasury PDA seed `token_treasury_v2`). A short "devnet account reference" table would have saved hours.

2. **`subscribe` requires the user's Token-2022 ATA to pre-exist.** The instruction doesn't `init_if_needed` the user token account, so the first call fails with `AccountNotInitialized` until you prepend an idempotent ATA-create instruction. Worth a one-line note in the docs.

3. **The shipped `validate_stat` IDL is missing a `returns` annotation.** Because the on-chain handler returns a `bool` but the IDL doesn't declare it, Anchor refuses to treat the method as a `.view()`. We had to inject `returns: "bool"` into the in-memory IDL before the read-only validation call would work. Adding the annotation to the published IDL would make the documented `.view()` example work out of the box.

4. **The devnet vs. mainnet endpoint split is easy to miss.** Data lives at `txline-dev.txodds.com` for devnet while guest auth is served from `txline.txodds.com`, and a guest JWT alone returns `403 "Missing API token"` on data endpoints — the full subscribe → sign → activate flow is required even on the free devnet tier. Calling this out prominently near the quickstart would prevent a common dead-end.

5. **`declare_program!` chokes on the IDL's pubkey-typed constants.** Anchor's codegen emits unscoped identifiers for the constants block, causing build errors when generating CPI bindings. We stripped the constants from the vendored IDL copy (they aren't needed for the CPI), but a CPI-clean IDL variant, or constants typed in a codegen-friendly way, would remove this snag.

## One small suggestion

A minimal end-to-end "subscribe → activate → fetch proof → CPI `validate_stat`" reference (with the exact devnet account values filled in) would dramatically shorten the path from zero to a working settlement engine. The pieces are all there in the docs, but they're spread across the quickstart, the world-cup tier page, and the on-chain validation example — stitching them together for *devnet specifically* was where most of the build time went.

Thanks for waiving data fees for the event and for shipping a verification primitive that's actually shaped right for this use case — the parametric `validate_stat` design is what made ProofKick possible.
