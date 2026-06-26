use anchor_lang::prelude::*;

/// Which side of the binary market a position backs.
/// `Yes` = "the predicate will hold", `No` = "it won't".
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum Side {
    Yes,
    No,
}

/// Comparison operator applied by the predicate. Mirrors `txoracle::types::Comparison`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

/// Operator combining two stats before comparison. Mirrors `txoracle::types::BinaryExpression`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum BinaryOp {
    Add,
    Subtract,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum MarketStatus {
    Open,
    Verified,
    Settled,
}

/// A binary prediction market over a TxLINE-provable stat predicate for one fixture.
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub fixture_id: i64,
    pub market_nonce: u64,

    // --- Predicate definition (what `verify_outcome` will prove on-chain) ---
    /// Stat A: key (e.g. 1002) and the period it applies to.
    pub stat_a_key: u32,
    pub stat_a_period: i32,
    /// Optional stat B for two-stat predicates (e.g. score differential).
    pub stat_b_key: Option<u32>,
    pub stat_b_period: i32,
    /// How stat A and stat B are combined (only used when `stat_b_key` is set).
    pub op: Option<BinaryOp>,
    /// Comparison + threshold the (combined) stat is tested against.
    pub comparison: Comparison,
    pub threshold: i32,

    // --- Escrow / accounting ---
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub total_yes: u64,
    pub total_no: u64,

    pub status: MarketStatus,
    pub winning_side: Option<Side>,
    pub bump: u8,
    pub vault_bump: u8,
}

/// One user's stake on one side of one market.
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub side: Side,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

/// The on-chain receipt written by `verify_outcome` after the TxLINE CPI.
#[account]
#[derive(InitSpace)]
pub struct VerifiedOutcome {
    pub market: Pubkey,
    pub predicate_held: bool,
    pub ts: i64,
    pub bump: u8,
}
