use anchor_lang::prelude::*;

#[error_code]
pub enum StruError {
    #[msg("Pool is already settled")]
    PoolAlreadySettled,
    #[msg("Pool deadline has not been reached yet")]
    DeadlineNotReached,
    #[msg("Pool deadline has passed")]
    PoolExpired,
    #[msg("Caller is not authorized")]
    Unauthorized,
    #[msg("Participant has already been marked complete")]
    AlreadyCompleted,
    #[msg("Participant has not completed the goal")]
    NotCompleted,
    #[msg("Pool is not settled yet")]
    PoolNotSettled,
    #[msg("No winners in this pool")]
    NoWinners,
}
