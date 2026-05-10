use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("qaAZkoNtDGzZreJkdAyrg8D2TxhWtXG4D21RfuF2TBf");

// Oracle keypair pubkey (HyVe1fm8c35hoGCR6ZR9PjtLN9pahQ2EAZpbz1oh74ao)
pub const ORACLE_PUBKEY: Pubkey = Pubkey::new_from_array([
    252, 51, 229, 185, 204, 142, 161, 221, 141, 147, 230, 91, 69, 69, 78, 114,
    113, 200, 13, 253, 85, 215, 178, 205, 48, 129, 143, 246, 53, 3, 143, 196,
]);

#[program]
pub mod stru {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        goal_hash: [u8; 32],
        stake_amount: u64,
        verification_budget: u64,
        duration_secs: i64,
        pool_id: u64,
    ) -> Result<()> {
        instructions::create_pool::handler(ctx, goal_hash, stake_amount, verification_budget, duration_secs, pool_id)
    }

    pub fn join_pool(ctx: Context<JoinPool>) -> Result<()> {
        instructions::join_pool::handler(ctx)
    }

    pub fn mark_complete(ctx: Context<MarkComplete>) -> Result<()> {
        instructions::mark_complete::handler(ctx)
    }

    pub fn settle_pool(ctx: Context<SettlePool>) -> Result<()> {
        instructions::settle_pool::handler(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    pub fn mint_badge(ctx: Context<MintBadge>, badge_type: String, wallet: Pubkey, pool_id: Pubkey) -> Result<()> {
        instructions::mint_badge::handler(ctx, badge_type, wallet, pool_id)
    }
}
