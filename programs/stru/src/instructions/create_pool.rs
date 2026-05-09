use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
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

    /// USDC mint
    pub mint: Account<'info, Mint>,

    /// Creator's USDC token account (source)
    #[account(mut, token::mint = mint)]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Pool vault — holds all staked USDC
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = pool_vault,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreatePool>,
    goal_hash: [u8; 32],
    stake_amount: u64,
    verification_budget: u64,
    duration_secs: i64,
    pool_id: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;

    pool.creator = ctx.accounts.creator.key();
    pool.goal_hash = goal_hash;
    pool.stake_amount = stake_amount;
    pool.verification_budget = verification_budget;
    pool.budget_spent = 0;
    pool.yield_accumulated = 0;
    pool.total_staked = stake_amount + verification_budget;
    pool.deadline = clock.unix_timestamp + duration_secs;
    pool.participant_count = 1;
    pool.completed_count = 0;
    pool.settled = false;
    pool.bump = ctx.bumps.pool;

    // Transfer stake + budget from creator to vault
    let total_deposit = stake_amount + verification_budget;
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        total_deposit,
    )?;

    Ok(())
}
