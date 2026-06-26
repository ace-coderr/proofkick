use crate::constants::*;
use crate::error::ProofKickError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [OUTCOME_SEED, market.key().as_ref()],
        bump = outcome.bump,
        constraint = outcome.market == market.key() @ ProofKickError::SideMismatch,
    )]
    pub outcome: Account<'info, VerifiedOutcome>,
}

/// Light instruction: reads the verification receipt and freezes the winning
/// side. Separate tx from `verify_outcome`, which is compute-heavy.
pub fn handler(ctx: Context<SettleMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(
        market.status == MarketStatus::Verified,
        ProofKickError::MarketNotVerified
    );

    let winning_side = if ctx.accounts.outcome.predicate_held {
        Side::Yes
    } else {
        Side::No
    };

    market.winning_side = Some(winning_side);
    market.status = MarketStatus::Settled;
    msg!("Market settled: winning_side = {:?}", winning_side);
    Ok(())
}
