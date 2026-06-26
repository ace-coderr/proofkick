use crate::constants::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PredicateConfig {
    pub stat_a_key: u32,
    pub stat_a_period: i32,
    pub stat_b_key: Option<u32>,
    pub stat_b_period: i32,
    pub op: Option<BinaryOp>,
    pub comparison: Comparison,
    pub threshold: i32,
}

#[derive(Accounts)]
#[instruction(fixture_id: i64, market_nonce: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, &fixture_id.to_le_bytes(), &market_nonce.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    fixture_id: i64,
    market_nonce: u64,
    cfg: PredicateConfig,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.fixture_id = fixture_id;
    market.market_nonce = market_nonce;

    market.stat_a_key = cfg.stat_a_key;
    market.stat_a_period = cfg.stat_a_period;
    market.stat_b_key = cfg.stat_b_key;
    market.stat_b_period = cfg.stat_b_period;
    market.op = cfg.op;
    market.comparison = cfg.comparison;
    market.threshold = cfg.threshold;

    market.usdc_mint = ctx.accounts.usdc_mint.key();
    market.vault = ctx.accounts.vault.key();
    market.total_yes = 0;
    market.total_no = 0;

    market.status = MarketStatus::Open;
    market.winning_side = None;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    msg!(
        "Market created: fixture {} nonce {} stat {} period {}",
        fixture_id,
        market_nonce,
        cfg.stat_a_key,
        cfg.stat_a_period
    );
    Ok(())
}
