use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Pool;

#[derive(Accounts)]
#[instruction(goal_hash: [u8; 32], stake_amount: u64, verification_budget: u64, duration_secs: i64, pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = creator,
        space = Pool::LEN,
        seeds = [b"pool", creator.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreatePool>,
    goal_hash: [u8; 32],
    stake_amount: u64,
    verification_budget: u64,
    duration_secs: i64,
    _pool_id: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let total_deposit = stake_amount + verification_budget;

    {
        let pool = &mut ctx.accounts.pool;
        pool.creator = ctx.accounts.creator.key();
        pool.goal_hash = goal_hash;
        pool.stake_amount = stake_amount;
        pool.verification_budget = verification_budget;
        pool.budget_spent = 0;
        pool.yield_accumulated = 0;
        pool.total_staked = total_deposit;
        pool.deadline = clock.unix_timestamp + duration_secs;
        pool.participant_count = 1;
        pool.completed_count = 0;
        pool.settled = false;
        pool.bump = ctx.bumps.pool;
    }

    // Transfer native SOL stake + verification budget into the pool PDA escrow.
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.pool.to_account_info(),
            },
        ),
        total_deposit,
    )?;

    Ok(())
}
