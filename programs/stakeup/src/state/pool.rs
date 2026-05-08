use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub creator: Pubkey,           // 32
    pub goal_hash: [u8; 32],       // 32
    pub stake_amount: u64,         // 8
    pub verification_budget: u64,  // 8
    pub budget_spent: u64,         // 8
    pub yield_accumulated: u64,    // 8
    pub total_staked: u64,         // 8
    pub deadline: i64,             // 8
    pub participant_count: u8,     // 1
    pub completed_count: u8,       // 1
    pub settled: bool,             // 1
    pub bump: u8,                  // 1
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 1;
}
