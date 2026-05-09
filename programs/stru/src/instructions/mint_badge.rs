use anchor_lang::prelude::*;
use crate::ORACLE_PUBKEY;
use crate::errors::StruError;

// Metaplex Bubblegum CPI is a stretch goal.
// For the hackathon demo this instruction is a stub that emits an event.
// The backend listens for BadgeMinted and records it in Supabase.

#[derive(Accounts)]
pub struct MintBadge<'info> {
    #[account(constraint = oracle.key() == ORACLE_PUBKEY @ StruError::Unauthorized)]
    pub oracle: Signer<'info>,
}

pub fn handler(ctx: Context<MintBadge>, badge_type: String, wallet: Pubkey, pool_id: Pubkey) -> Result<()> {
    emit!(BadgeMinted {
        wallet,
        pool: pool_id,
        badge_type,
    });
    Ok(())
}

#[event]
pub struct BadgeMinted {
    pub wallet: Pubkey,
    pub pool: Pubkey,
    pub badge_type: String,
}
