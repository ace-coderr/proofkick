use crate::constants::*;
use crate::error::ProofKickError;
use crate::state::*;
use crate::txoracle;
use crate::txoracle::types::{
    BinaryExpression, Comparison as TxComparison, ProofNode, ScoresBatchSummary, StatTerm,
    TraderPredicate,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::get_return_data;

#[derive(Accounts)]
pub struct VerifyOutcome<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = payer,
        space = 8 + VerifiedOutcome::INIT_SPACE,
        seeds = [OUTCOME_SEED, market.key().as_ref()],
        bump,
    )]
    pub outcome: Account<'info, VerifiedOutcome>,

    /// CHECK: The TxLINE program validates this PDA's seeds, discriminator and
    /// owner internally; we only forward it through the CPI.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,

    pub txoracle_program: Program<'info, txoracle::program::Txoracle>,

    pub system_program: Program<'info, System>,
}

fn map_comparison(c: Comparison) -> TxComparison {
    match c {
        Comparison::GreaterThan => TxComparison::GreaterThan,
        Comparison::LessThan => TxComparison::LessThan,
        Comparison::EqualTo => TxComparison::EqualTo,
    }
}

fn map_op(o: BinaryOp) -> BinaryExpression {
    match o {
        BinaryOp::Add => BinaryExpression::Add,
        BinaryOp::Subtract => BinaryExpression::Subtract,
    }
}

/// Heavy instruction: replays the supplied Merkle proof through TxLINE's
/// `validate_stat` via CPI and records the boolean result. Kept separate from
/// `settle_market` so the two run in their own transactions.
pub fn handler(
    ctx: Context<VerifyOutcome>,
    ts: i64,
    fixture_summary: ScoresBatchSummary,
    fixture_proof: Vec<ProofNode>,
    main_tree_proof: Vec<ProofNode>,
    stat_a: StatTerm,
    stat_b: Option<StatTerm>,
) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        market.status == MarketStatus::Open,
        ProofKickError::MarketNotOpen
    );

    // The proof must be for the stat this market was created to settle.
    require!(
        stat_a.stat_to_prove.key == market.stat_a_key
            && stat_a.stat_to_prove.period == market.stat_a_period,
        ProofKickError::StatMismatch
    );

    let op = match market.stat_b_key {
        Some(b_key) => {
            let sb = stat_b.as_ref().ok_or(ProofKickError::MissingSecondStat)?;
            require!(
                sb.stat_to_prove.key == b_key
                    && sb.stat_to_prove.period == market.stat_b_period,
                ProofKickError::StatMismatch
            );
            market.op.map(map_op)
        }
        None => {
            require!(stat_b.is_none(), ProofKickError::UnexpectedSecondStat);
            None
        }
    };

    let predicate = TraderPredicate {
        threshold: market.threshold,
        comparison: map_comparison(market.comparison),
    };

    // --- CPI into TxLINE validate_stat (read-only verification) ---
    let cpi_ctx = CpiContext::new(
        ctx.accounts.txoracle_program.to_account_info(),
        txoracle::cpi::accounts::ValidateStat {
            daily_scores_merkle_roots: ctx.accounts.daily_scores_merkle_roots.to_account_info(),
        },
    );
    txoracle::cpi::validate_stat(
        cpi_ctx,
        ts,
        fixture_summary,
        fixture_proof,
        main_tree_proof,
        predicate,
        stat_a,
        stat_b,
        op,
    )?;

    // Read the bool returned by validate_stat via the return-data buffer.
    let (program_key, data) = get_return_data().ok_or(ProofKickError::NoReturnData)?;
    require_keys_eq!(
        program_key,
        ctx.accounts.txoracle_program.key(),
        ProofKickError::NoReturnData
    );
    let predicate_held = bool::try_from_slice(&data)?;
    msg!("TxLINE validate_stat -> predicate_held = {}", predicate_held);

    let outcome = &mut ctx.accounts.outcome;
    outcome.market = ctx.accounts.market.key();
    outcome.predicate_held = predicate_held;
    outcome.ts = ts;
    outcome.bump = ctx.bumps.outcome;

    ctx.accounts.market.status = MarketStatus::Verified;
    Ok(())
}
