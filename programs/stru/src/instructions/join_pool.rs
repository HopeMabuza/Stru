use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Pool, Participant};
use crate::errors::StruError;

#[derive(Accounts)]
pub struct JoinPool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = participant_wallet,
        space = Participant::LEN,
        seeds = [b"participant", pool.key().as_ref(), participant_wallet.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,

    #[account(mut)]
    pub participant_wallet: Signer<'info>,

    #[account(mut)]
    pub participant_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<JoinPool>) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;

    require!(!pool.settled, StruError::PoolAlreadySettled);
    require!(clock.unix_timestamp < pool.deadline, StruError::PoolExpired);

    let participant = &mut ctx.accounts.participant;
    participant.wallet = ctx.accounts.participant_wallet.key();
    participant.pool = pool.key();
    participant.completed = false;
    participant.joined_at = clock.unix_timestamp;
    participant.bump = ctx.bumps.participant;

    pool.participant_count = pool.participant_count.checked_add(1).unwrap();
    pool.total_staked = pool.total_staked.checked_add(pool.stake_amount).unwrap();

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.participant_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.participant_wallet.to_account_info(),
            },
        ),
        pool.stake_amount,
    )?;

    Ok(())
}
