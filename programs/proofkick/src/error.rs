use anchor_lang::prelude::*;

#[error_code]
pub enum ProofKickError {
    #[msg("Market is not open for positions")]
    MarketNotOpen,
    #[msg("Market has not been verified yet")]
    MarketNotVerified,
    #[msg("Market is not settled")]
    MarketNotSettled,
    #[msg("Position amount must be greater than zero")]
    ZeroAmount,
    #[msg("Proven stat does not match the market predicate")]
    StatMismatch,
    #[msg("This is a two-stat market; a second stat proof is required")]
    MissingSecondStat,
    #[msg("This is a single-stat market; no second stat expected")]
    UnexpectedSecondStat,
    #[msg("The TxLINE program did not return validation data")]
    NoReturnData,
    #[msg("Position has already been claimed")]
    AlreadyClaimed,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Winning side mismatch")]
    SideMismatch,
    #[msg("Existing position is on the other side; cannot mix sides")]
    PositionSideMismatch,
}
