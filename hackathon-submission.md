# Stru — Hackathon Submission Form

## Project Name
Stru

---

## One-liner
Stake USDC with friends on a shared goal — an AI verifies your proof, and winners split the pot when time runs out.

---

## Partner Track
> To decide: **Virtuals** is the strongest candidate since the AI agent is load-bearing (goal refinement + evidence verification). Leave blank if unsure.

---

## Category
**Social / Community**

---

## Smart Contract / Program Address
> Fill in after deploying to devnet.
`[INSERT DEVNET PROGRAM ADDRESS]`

---

## Local Hub
Johannesburg, South Africa *(auto-detected)*

---

## Description
*(300 words max)*

Goals are easy to set and easy to abandon. Stru fixes that by putting money on the line and letting your friends watch.

**The problem:** Accountability apps rely on the honor system. You tell your friends about your goal, they politely forget by week two, and so do you. Nothing actually changes.

**What Stru does:** A group of friends pools USDC into a shared on-chain escrow. Everyone commits to the same goal — say, 12 gym sessions in 30 days. The pool earns yield while the timer runs. When it hits zero, everyone who completed their goal splits the full pot: their original stake, the yield it earned, and the forfeited stakes of everyone who didn't show up.

**The AI referee:** You can't just say you went to the gym. You submit evidence — a photo, a screenshot, a Strava export. An AI agent reviews it, decides if it counts, and explains its verdict out loud. No humans, no honor system, no disputes.

**Where x402 comes in:** Every verification call costs a small USDC fee drawn from the pool's budget. Spamming bad proof attempts drains the pot for everyone. Whatever the pool doesn't spend on verification rolls into the winners' payout — so efficient verification literally makes winners richer. Micropayments aren't a tax, they're a game mechanic.

**The stack:** Anchor smart contract on Solana handles escrow, yield routing (Kamino), and settlement. A Node.js backend hosts the AI verification endpoints gated behind x402 payments. A Next.js frontend gives each participant a live dashboard showing the group's progress and a one-click claim when they win.

Stru isn't a DeFi tool. It's peer pressure, but make it onchain.

---

## Tech Stack
- Anchor (Rust) — Solana smart contract
- Solana Web3.js + SPL Token
- Kamino — yield on pooled USDC
- Claude API — goal refinement + evidence verification
- x402-solana SDK — pay-per-verification micropayments
- Next.js + Tailwind + Solana Wallet Adapter — frontend
- Node.js + Express — backend / AI agent host
