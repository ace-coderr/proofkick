use crate::constants::*;
use crate::error::ProofKickError;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct PlacePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
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
        init,
        payer = owner,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, Position>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlacePosition>, side: Side, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        ProofKickError::MarketNotOpen
    );
    require!(amount > 0, ProofKickError::ZeroAmount);

    // Escrow USDC into the market vault.
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.owner_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        amount,
    )?;

    let market = &mut ctx.accounts.market;
    match side {
        Side::Yes => {
            market.total_yes = market
                .total_yes
                .checked_add(amount)
                .ok_or(ProofKickError::Overflow)?
        }
        Side::No => {
            market.total_no = market
                .total_no
                .checked_add(amount)
                .ok_or(ProofKickError::Overflow)?
        }
    }

    let position = &mut ctx.accounts.position;
    position.market = market.key();
    position.owner = ctx.accounts.owner.key();
    position.side = side;
    position.amount = amount;
    position.claimed = false;
    position.bump = ctx.bumps.position;

    Ok(())
}
