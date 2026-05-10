use anchor_lang::prelude::*;
use crate::state::{Pool, Participant};
use crate::errors::StruError;

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        seeds = [b"participant", pool.key().as_ref(), winner.key().as_ref()],
        bump = participant.bump,
        constraint = participant.wallet == winner.key() @ StruError::Unauthorized,
        constraint = participant.completed @ StruError::NotCompleted,
    )]
    pub participant: Account<'info, Participant>,

    #[account(mut)]
    pub winner: Signer<'info>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let pool = &ctx.accounts.pool;

    require!(pool.settled, StruError::PoolNotSettled);

    let winners = pool.completed_count as u64;
    require!(winners > 0, StruError::NoWinners);

    let losers = (pool.participant_count as u64).saturating_sub(winners);
    let loser_stakes = losers * pool.stake_amount;
    let unspent_budget = pool.verification_budget.saturating_sub(pool.budget_spent);

    let payout = pool.stake_amount
        + loser_stakes / winners
        + unspent_budget / winners
        + pool.yield_accumulated / winners;

    let pool_info = ctx.accounts.pool.to_account_info();
    let winner_info = ctx.accounts.winner.to_account_info();
    let pool_lamports = pool_info.lamports();
    let winner_lamports = winner_info.lamports();

    **pool_info.try_borrow_mut_lamports()? = pool_lamports
        .checked_sub(payout)
        .ok_or(StruError::InsufficientEscrowBalance)?;
    **winner_info.try_borrow_mut_lamports()? = winner_lamports
        .checked_add(payout)
        .ok_or(StruError::MathOverflow)?;

    Ok(())
}
