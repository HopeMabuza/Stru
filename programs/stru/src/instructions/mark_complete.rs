use anchor_lang::prelude::*;
use crate::state::{Pool, Participant};
use crate::errors::StruError;
use crate::ORACLE_PUBKEY;

#[derive(Accounts)]
pub struct MarkComplete<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"participant", pool.key().as_ref(), participant.wallet.as_ref()],
        bump = participant.bump,
    )]
    pub participant: Account<'info, Participant>,

    /// Oracle signer — must match ORACLE_PUBKEY
    #[account(constraint = oracle.key() == ORACLE_PUBKEY @ StruError::Unauthorized)]
    pub oracle: Signer<'info>,
}

pub fn handler(ctx: Context<MarkComplete>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let participant = &mut ctx.accounts.participant;

    require!(!pool.settled, StruError::PoolAlreadySettled);
    require!(!participant.completed, StruError::AlreadyCompleted);

    participant.completed = true;
    pool.completed_count = pool.completed_count.checked_add(1).unwrap();

    Ok(())
}
