use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::Pool;
use crate::errors::StruError;

#[derive(Accounts)]
pub struct SettlePool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SettlePool>) -> Result<()> {
    let clock = Clock::get()?;

    require!(!ctx.accounts.pool.settled, StruError::PoolAlreadySettled);
    require!(clock.unix_timestamp >= ctx.accounts.pool.deadline, StruError::DeadlineNotReached);

    // Snapshot values before mutably borrowing
    let pool_key = ctx.accounts.pool.key();
    let completed_count = ctx.accounts.pool.completed_count;
    let participant_count = ctx.accounts.pool.participant_count;
    let total_staked = ctx.accounts.pool.total_staked;
    let budget_spent = ctx.accounts.pool.budget_spent;
    let yield_accumulated = ctx.accounts.pool.yield_accumulated;

    ctx.accounts.pool.settled = true;

    emit!(PoolSettled {
        pool: pool_key,
        completed_count,
        participant_count,
        total_staked,
        budget_spent,
        yield_accumulated,
    });

    Ok(())
}

#[event]
pub struct PoolSettled {
    pub pool: Pubkey,
    pub completed_count: u8,
    pub participant_count: u8,
    pub total_staked: u64,
    pub budget_spent: u64,
    pub yield_accumulated: u64,
}
