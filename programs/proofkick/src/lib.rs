pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

// Generate CPI bindings for the TxLINE / txoracle program from the vendored
// IDL at <workspace>/idls/txoracle.json.
declare_program!(txoracle);

declare_id!("921ys67mT4rn62pg2ZvfkrNoS581bU6u3QJojtBV71Qm");

#[program]
pub mod proofkick {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>,
        fixture_id: i64,
        market_nonce: u64,
        cfg: PredicateConfig,
    ) -> Result<()> {
        create_market::handler(ctx, fixture_id, market_nonce, cfg)
    }

    pub fn place_position(ctx: Context<PlacePosition>, side: Side, amount: u64) -> Result<()> {
        place_position::handler(ctx, side, amount)
    }

    pub fn verify_outcome(
        ctx: Context<VerifyOutcome>,
        ts: i64,
        fixture_summary: crate::txoracle::types::ScoresBatchSummary,
        fixture_proof: Vec<crate::txoracle::types::ProofNode>,
        main_tree_proof: Vec<crate::txoracle::types::ProofNode>,
        stat_a: crate::txoracle::types::StatTerm,
        stat_b: Option<crate::txoracle::types::StatTerm>,
    ) -> Result<()> {
        verify_outcome::handler(
            ctx,
            ts,
            fixture_summary,
            fixture_proof,
            main_tree_proof,
            stat_a,
            stat_b,
        )
    }

    pub fn settle_market(ctx: Context<SettleMarket>) -> Result<()> {
        settle_market::handler(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim::handler(ctx)
    }
}
