use crate::constants::*;
use crate::error::ProofKickError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.key() == market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.mint == market.usdc_mint,
        constraint = owner_token_account.owner == owner.key(),
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), owner.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == owner.key() @ ProofKickError::SideMismatch,
    )]
    pub position: Account<'info, Position>,

    pub token_program: Program<'info, Token>,
}

/// Pro-rata payout to a winning position. Losers get zero; the call still
/// marks their position claimed so it can't be replayed.
pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        market.status == MarketStatus::Settled,
        ProofKickError::MarketNotSettled
    );

    let position = &ctx.accounts.position;
    require!(!position.claimed, ProofKickError::AlreadyClaimed);

    let winning_side = market.winning_side.ok_or(ProofKickError::MarketNotSettled)?;

    let payout: u64 = if position.side == winning_side {
        let total_pool = (market.total_yes as u128)
            .checked_add(market.total_no as u128)
            .ok_or(ProofKickError::Overflow)?;
        let winning_total = match winning_side {
            Side::Yes => market.total_yes as u128,
            Side::No => market.total_no as u128,
        };
        // winning_total > 0 because this position is on the winning side.
        let share = (position.amount as u128)
            .checked_mul(total_pool)
            .ok_or(ProofKickError::Overflow)?
            .checked_div(winning_total)
            .ok_or(ProofKickError::Overflow)?;
        u64::try_from(share).map_err(|_| ProofKickError::Overflow)?
    } else {
        0
    };

    if payout > 0 {
        let fixture_id = market.fixture_id.to_le_bytes();
        let market_nonce = market.market_nonce.to_le_bytes();
        let bump = [market.bump];
        let signer_seeds: &[&[&[u8]]] =
            &[&[MARKET_SEED, &fixture_id, &market_nonce, &bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;
    }

    let position = &mut ctx.accounts.position;
    position.claimed = true;
    msg!("Claim: side {:?} payout {}", position.side, payout);
    Ok(())
}
