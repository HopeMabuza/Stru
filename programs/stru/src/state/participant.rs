use anchor_lang::prelude::*;

#[account]
pub struct Participant {
    pub wallet: Pubkey,   // 32
    pub pool: Pubkey,     // 32
    pub completed: bool,  // 1
    pub joined_at: i64,   // 8
    pub bump: u8,         // 1
}

impl Participant {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1;
}
