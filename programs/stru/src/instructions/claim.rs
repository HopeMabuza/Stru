use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
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

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub winner_token_account: Account<'info, TokenAccount>,

    pub winner: Signer<'info>,

    pub token_program: Program<'info, Token>,
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

    let pool_key = pool.key();
    let seeds = &[b"vault".as_ref(), pool_key.as_ref()];
    let (_, vault_bump) = Pubkey::find_program_address(seeds, ctx.program_id);
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault", pool_key.as_ref(), &[vault_bump]]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.pool_vault.to_account_info(),
            },
            signer_seeds,
        ),
        payout,
    )?;

    Ok(())
}
