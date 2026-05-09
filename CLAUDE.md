# Stru — CLAUDE.md

> Bet on yourself. Get paid when your friends flake.

Canonical reference for the entire Stru build. All architecture decisions, flows, schemas, and constraints live here. When in doubt, this file wins.

---

## 1. Project Overview

**What it is:** A friend-group goal accountability app on Solana. Friends stake USDC into a shared on-chain pool, commit to a shared goal, and an AI referee verifies proof submissions. When the timer ends, winners split the pot — original stake + yield + forfeited stakes from everyone who flaked.

**What makes it different:**
- AI sets the goal (not you) — conversation loop until the goal is measurable and verifiable
- AI checks the receipts — no honor system, no human referee
- x402 micropayments make verification a game mechanic — unspent budget becomes winner payout
- NFT badges for completed goals — bragging rights on-chain
- Privy smart wallets — no Phantom required, email/social login works

**Hackathon:** dev3pack, 48 hours, Solana. Target: devnet deployment + 3-min demo video.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                    │
│  Privy Auth → GoalChat → PoolDashboard → Claim      │
└──────────────────────┬──────────────────────────────┘
                       │ REST
┌──────────────────────▼──────────────────────────────┐
│              Node.js + Express Backend               │
│  /goal/chat  /goal/create  /verify (x402-gated)     │
│  goalAgent.ts (Haiku)   verifyAgent.ts (Sonnet)     │
└────────┬──────────────────────────┬─────────────────┘
         │ Anchor CPI               │ Supabase client
┌────────▼──────────┐    ┌──────────▼──────────────────┐
│  Solana Program   │    │       Supabase (Postgres)    │
│  (Anchor / Rust)  │    │  users, pools, participants  │
│  Pool PDA escrow  │    │  evidence, badges            │
│  SPL Token xfer   │    └─────────────────────────────┘
│  Settlement math  │
│  Metaplex CPI     │
└───────────────────┘
```

---

## 3. Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Auth | Privy | Email/social → embedded Solana wallet. No Phantom needed. |
| Frontend | Next.js 14 + Tailwind + shadcn/ui | App router. Responsive web only for v1. |
| Wallet | Privy embedded + @solana/web3.js | Privy handles signing UX |
| Backend | Node.js + Express + TypeScript | Hosts AI agents and x402 endpoints |
| AI — Goal | claude-haiku-4-5 | Fast, cheap for multi-turn conversation |
| AI — Verify | claude-sonnet-4-6 | Vision capability, accuracy over speed |
| Payments | x402-solana SDK + x402-express | Pay-per-verification micropayments |
| On-chain | Anchor (Rust) + SPL Token | Pool escrow, settlement, participant tracking |
| Yield | Stubbed in Pool state (v1) | Fake accumulator; real Kamino CPI is post-hackathon |
| NFTs | Metaplex Bubblegum (compressed NFTs) | ~$0.001/mint on devnet |
| Database | Supabase (PostgreSQL) | Off-chain pool state, evidence logs, badges |
| Deployment | Solana devnet | Program address goes in README + submission form |

---

## 4. Project Structure

```
stru/
├── CLAUDE.md
├── Anchor.toml
├── Cargo.toml
├── .env.example
├── .gitignore
│
├── programs/
│   └── stru/
│       └── src/
│           ├── lib.rs                  # Program entrypoint, declare_id!, mod exports
│           ├── instructions/
│           │   ├── mod.rs
│           │   ├── create_pool.rs      # Init pool PDA, take creator stake + budget
│           │   ├── join_pool.rs        # Participant stakes USDC into pool
│           │   ├── mark_complete.rs    # Oracle marks participant as completed
│           │   ├── settle_pool.rs      # Distribute funds after deadline
│           │   └── mint_badge.rs       # Metaplex Bubblegum CPI per winner
│           ├── state/
│           │   ├── mod.rs
│           │   ├── pool.rs             # Pool account struct
│           │   └── participant.rs      # Participant account struct
│           └── errors.rs               # Custom error codes
│
├── app/                                # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx                  # Privy provider wrapper
│   │   ├── page.tsx                    # Landing / login
│   │   ├── dashboard/page.tsx          # User's active pools
│   │   └── pool/[id]/page.tsx          # Pool view (invite link target)
│   ├── components/
│   │   ├── GoalChat.tsx                # Multi-turn AI conversation + CREATE GOAL button
│   │   ├── PoolDashboard.tsx           # Timer, participant tiles, progress
│   │   ├── ProofSubmit.tsx             # File upload + AI verdict display
│   │   └── ClaimButton.tsx             # Post-settlement claim transaction
│   └── lib/
│       ├── privy.ts                    # Privy client config
│       ├── supabase.ts                 # Supabase browser client
│       └── anchor.ts                   # Anchor program client + IDL
│
├── backend/
│   ├── index.ts                        # Express app, middleware, route mount
│   ├── routes/
│   │   ├── goal.ts                     # POST /goal/chat, POST /goal/create
│   │   └── verify.ts                   # POST /verify (x402-gated)
│   ├── ai/
│   │   ├── goalAgent.ts                # Goal refinement prompt + measurability check
│   │   └── verifyAgent.ts              # Evidence verification prompt + vision
│   └── x402/
│       └── middleware.ts               # x402-express setup, price config
│
├── tests/
│   └── stru.ts                         # Anchor test suite
│
└── supabase/
    └── schema.sql                      # Full schema, run once on new Supabase project
```

---

## 5. Core Flows

### A. Auth — Privy Smart Wallet

1. User lands on app → `<PrivyProvider>` wraps the app
2. Unauthenticated → redirect to `/` login screen
3. User clicks "Login" → Privy modal (email OTP or Google/Twitter)
4. Privy creates embedded Solana wallet automatically — user never sees a seed phrase
5. On first login → `POST /api/users` → insert into Supabase `users` (wallet_address, privy_id)
6. All subsequent transactions signed via `useSendTransaction()` from Privy SDK

### B. AI Goal-Setting Conversation

```
User types: "I want to get fit"
     ↓
POST /goal/chat { message, history[] }
     ↓
goalAgent (claude-haiku-4-5) asks clarifying questions:
  - "How many times per week?"
  - "What counts as evidence?"
  - "Over what time period?"
     ↓
Loop until goal is MEASURABLE:
  goal object = {
    "description": "Go to the gym 12 times",
    "proof_type": "photo of cardio machine showing elapsed time",
    "threshold": 12,
    "unit": "sessions",
    "verifiable": true
  }
     ↓
If goal cannot be made measurable after 3 turns:
  AI returns 3 alternative reframings for the user to pick from
     ↓
Once measurable: AI presents summary + frontend shows [CREATE GOAL] button
     ↓
User clicks CREATE GOAL → POST /goal/create {
  goal, stake_amount, duration_secs, creator_wallet
}
     ↓
Backend:
  1. Hash goal JSON → goal_hash (stored on-chain)
  2. Call Anchor create_pool instruction
  3. Insert into Supabase pools table
  4. Return { pool_id, pool_pda, invite_link }
     ↓
Invite link: https://app.stru.xyz/pool/{pool_id}
```

**Goal measurability criteria (all four required):**
- Has a concrete **action** ("go to the gym", not "get fit")
- Has a **quantity** (12 sessions, 5km, 10 pages)
- Has a **proof type** (photo, screenshot, export)
- Is **verifiable by an AI** looking at an image or file

### C. Join Flow

1. Friend opens invite link → `/pool/[id]` page
2. Page fetches pool from Supabase: goal text, stake amount, deadline, current participants
3. Friend logs in via Privy (if not already)
4. Clicks "Join & Stake {amount} USDC" → signs `join_pool` transaction
5. Backend inserts into Supabase `participants` with status `pending`

### D. Proof Submission + AI Verification (x402)

```
User uploads file in ProofSubmit component
     ↓
POST /verify (multipart form: file, pool_id, wallet_address)
     ↓
x402 middleware intercepts:
  - Checks pool budget PDA has sufficient balance ($0.02 USDC)
  - Deducts from pool budget
  - Passes request through
     ↓
verifyAgent (claude-sonnet-4-6 with vision):
  - Receives: image + goal object (fetched from Supabase by pool_id)
  - Prompt: check if evidence satisfies proof_type and threshold
  - Returns: { verdict: "pass"|"fail", reason: string, what_would_count: string }
     ↓
On PASS:
  - Backend calls mark_complete instruction (oracle keypair signs)
  - Supabase participants.status → "completed"
     ↓
On FAIL:
  - Supabase participants.status stays "pending"
  - User can resubmit (costs another $0.02 from pool budget)
     ↓
Always: insert into Supabase evidence table with full verdict + reason
Always: return verdict + reason to frontend (shown in chat UI, never just an icon)
```

### E. Settlement + Badge Minting

1. Timer hits zero → `settle_pool` becomes callable by anyone
2. Frontend shows "Settle Pool" button when `Date.now() > pool.deadline`
3. User clicks → signs `settle_pool` transaction
4. Contract: counts completed participants, distributes pool balance proportionally to winners
   - Each winner gets: their stake + (yield_stub / winners) + (unspent_budget / winners)
5. Backend listens for `PoolSettled` event → for each winner:
   - Calls `mint_badge` (Metaplex Bubblegum CPI)
   - Inserts into Supabase `badges`
   - Checks lifetime completions → mints streak badges if threshold hit
6. Frontend: winner sees "Claim" button → signs claim transaction → USDC in wallet

---

## 6. Anchor Program

### Pool PDA
```
seeds = [b"pool", creator_pubkey.as_ref(), pool_id.to_le_bytes().as_ref()]
```

### Participant PDA
```
seeds = [b"participant", pool_pubkey.as_ref(), user_pubkey.as_ref()]
```

### Account Structs

```rust
// pool.rs
#[account]
pub struct Pool {
    pub creator: Pubkey,          // 32
    pub goal_hash: [u8; 32],      // 32 — keccak256 of goal JSON
    pub stake_amount: u64,        // 8  — per-participant stake in lamports (USDC)
    pub verification_budget: u64, // 8  — total x402 budget deposited by creator
    pub budget_spent: u64,        // 8  — tracks spend, rolled into settlement
    pub yield_accumulated: u64,   // 8  — stub: incremented by backend cron
    pub total_staked: u64,        // 8  — grows as participants join
    pub deadline: i64,            // 8  — Unix timestamp
    pub participant_count: u8,    // 1
    pub completed_count: u8,      // 1
    pub settled: bool,            // 1
    pub bump: u8,                 // 1
}
// Space: 8 (discriminator) + 32+32+8+8+8+8+8+8+1+1+1+1 = 124 bytes

// participant.rs
#[account]
pub struct Participant {
    pub wallet: Pubkey,           // 32
    pub pool: Pubkey,             // 32
    pub completed: bool,          // 1
    pub joined_at: i64,           // 8
    pub bump: u8,                 // 1
}
// Space: 8 + 32+32+1+8+1 = 82 bytes
```

### Instructions

```rust
// create_pool — creator initializes pool and deposits stake + budget
pub fn create_pool(
    ctx: Context<CreatePool>,
    goal_hash: [u8; 32],
    stake_amount: u64,
    verification_budget: u64,
    duration_secs: i64,
) -> Result<()>

// join_pool — participant deposits stake
pub fn join_pool(ctx: Context<JoinPool>) -> Result<()>

// mark_complete — oracle backend wallet signs this after AI verification passes
pub fn mark_complete(ctx: Context<MarkComplete>) -> Result<()>

// settle_pool — permissionless after deadline; distributes to winners
pub fn settle_pool(ctx: Context<SettlePool>) -> Result<()>

// mint_badge — called by backend per winner post-settlement (Metaplex Bubblegum CPI)
pub fn mint_badge(ctx: Context<MintBadge>, badge_type: String) -> Result<()>
```

### Key Constraints
- `join_pool`: fails if `pool.settled == true` or `clock.unix_timestamp >= pool.deadline`
- `mark_complete`: only callable by `ORACLE_PUBKEY` (hardcoded in program)
- `settle_pool`: fails if `clock.unix_timestamp < pool.deadline` or `pool.settled == true`
- `settle_pool`: if `completed_count == 0`, all stakes refunded pro-rata (no one loses)

---

## 7. Supabase Schema

```sql
-- supabase/schema.sql

create table users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  privy_id text unique not null,
  created_at timestamptz default now()
);

create table pools (
  id uuid primary key default gen_random_uuid(),
  program_pda text not null,           -- on-chain pool PDA address
  goal_text text not null,             -- human-readable goal
  goal_json jsonb not null,            -- full measurable goal object
  stake_amount numeric not null,       -- USDC per participant
  budget numeric not null,             -- verification budget
  deadline timestamptz not null,
  status text default 'active',        -- active | settled | cancelled
  creator_id uuid references users(id),
  created_at timestamptz default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id),
  wallet_address text not null,
  status text default 'pending',       -- pending | completed | failed
  joined_at timestamptz default now(),
  unique(pool_id, wallet_address)
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id),
  wallet_address text not null,
  file_url text not null,              -- Supabase Storage URL
  ai_verdict text not null,            -- pass | fail
  ai_reason text not null,
  what_would_count text,               -- always returned by AI
  confidence numeric,
  submitted_at timestamptz default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  badge_type text not null,            -- FIRST_WIN | STREAK_3 | STREAK_5 | PERFECT
  mint_address text,                   -- compressed NFT mint address
  pool_id uuid references pools(id),
  earned_at timestamptz default now()
);
```

---

## 8. AI Agent Behavior

### Goal Agent (claude-haiku-4-5)

**System prompt:**
```
You are a goal-setting coach for Stru, an accountability app.
Your job is to turn vague goals into measurable, verifiable commitments.

A goal is MEASURABLE when it has ALL of:
1. A concrete action (not a feeling or state)
2. A quantity (number, frequency, duration)
3. A proof type (what evidence will you accept?)
4. Verifiability (can an AI look at a photo/screenshot and confirm it?)

Ask clarifying questions one at a time. Be friendly but direct.

When you have enough information, output a JSON object:
{
  "description": "...",
  "proof_type": "...",
  "threshold": <number>,
  "unit": "...",
  "verifiable": true
}
Prefix it with: GOAL_READY:

If after 3 exchanges you cannot make the goal measurable, output:
ALTERNATIVES:
1. [reframed option]
2. [reframed option]
3. [reframed option]
```

**Never confirm a goal that relies on self-reporting alone.**

### Verify Agent (claude-sonnet-4-6)

**System prompt:**
```
You are an evidence verifier for Stru. You receive:
- An image or file submitted as proof
- The goal object the user committed to

Decide if the evidence satisfies the goal's proof_type and threshold.
Be strict but fair. Explain your reasoning in plain English.

Always return JSON:
{
  "verdict": "pass" | "fail",
  "reason": "...",
  "what_would_count": "..."
}

Common rejection reasons to check:
- Image does not match the required proof type
- Timestamp/metrics are missing or unclear
- Image appears to be from the internet (reverse image check if possible)
- Evidence is for a different activity than committed
```

**AI reasoning is always shown in the UI. Never return just pass/fail.**

---

## 9. x402 Integration

- Middleware: `x402-express` on `POST /verify`
- Payer: pool budget PDA (backend oracle keypair authorizes on behalf of PDA)
- Price: `VERIFY_PRICE_USDC=0.02` (set in `.env`)
- Unspent budget at settlement = `pool.verification_budget - pool.budget_spent`
- Unspent budget is distributed to winners as part of `settle_pool`

**Flow:**
```
Client → POST /verify
  x402 middleware checks payment header
  If missing: responds 402 with payment details
  Client (or Privy wallet) pays $0.02 USDC
  Middleware confirms payment → passes to verifyAgent
```

For the hackathon demo, the frontend can auto-pay x402 fees from the user's Privy wallet — no manual step needed.

---

## 10. NFT Badge Tiers

All badges are compressed NFTs via Metaplex Bubblegum. Cost ~$0.001 each on devnet.

| Badge | Trigger | Metadata note |
|---|---|---|
| `FIRST_WIN` | First goal completed ever | Issued after first `settle_pool` where user is winner |
| `STREAK_3` | 3 lifetime goal completions | Check `badges` count for wallet |
| `STREAK_5` | 5 lifetime goal completions | Check `badges` count for wallet |
| `PERFECT` | Zero rejected submissions in a completed pool | Check `evidence` table for wallet+pool |

Badge metadata (stored on Arweave or IPFS):
```json
{
  "name": "Stru — First Win",
  "symbol": "STRU",
  "description": "Completed a Stru goal pool",
  "attributes": [
    { "trait_type": "badge_type", "value": "FIRST_WIN" },
    { "trait_type": "goal", "value": "12 gym sessions" },
    { "trait_type": "pool_id", "value": "..." },
    { "trait_type": "completed_at", "value": "2026-05-08" }
  ]
}
```

---

## 11. Environment Variables

```bash
# .env.example

# Solana
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=./keypairs/oracle.json    # Oracle keypair for mark_complete
PROGRAM_ID=                             # Fill after anchor deploy

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=               # From Privy dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=              # Backend only, never expose to client

# Anthropic
ANTHROPIC_API_KEY=

# x402
X402_FACILITATOR_URL=                   # x402 facilitator endpoint
ORACLE_WALLET_PRIVATE_KEY=              # Base58 private key for oracle

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
VERIFY_PRICE_USDC=0.02
```

---

## 12. Dev Commands

```bash
# ── Solana / Anchor ──────────────────────────────
anchor build                             # Compile Rust program
anchor test                              # Run tests against localnet
anchor deploy --provider.cluster devnet  # Deploy to devnet
anchor idl init --filepath target/idl/stru.json <PROGRAM_ID> --provider.cluster devnet

# ── Frontend ─────────────────────────────────────
cd app
npm install
npm run dev                              # http://localhost:3000

# ── Backend ──────────────────────────────────────
cd backend
npm install
npm run dev                              # http://localhost:4000

# ── Supabase ─────────────────────────────────────
# Run schema.sql in Supabase SQL editor (one-time setup)
# Enable Storage bucket: "evidence" (public read, authenticated write)
```

---

## 13. Hackathon Scope — v1 Only

These are intentional constraints, not bugs. Do not add complexity beyond this list.

| Feature | v1 Status | Notes |
|---|---|---|
| One goal per pool | ✅ Ship | Everyone commits to the same goal |
| Per-participant goals | ❌ Cut | Post-hackathon |
| Binary pass/fail | ✅ Ship | No partial credit |
| Partial credit / streaks | ❌ Cut | Post-hackathon |
| USDC only | ✅ Ship | |
| SOL / other stables | ❌ Cut | |
| Yield (stubbed) | ✅ Ship | Fake accumulator, shown in UI |
| Kamino live CPI | ❌ Cut | Real yield post-hackathon |
| Squad-only pools (invite link) | ✅ Ship | |
| Open pools (min buy-in) | ❌ Cut | 30-min UI change, do post-hackathon |
| AI verdict is final | ✅ Ship | |
| Group-vote dispute override | ❌ Cut | Post-hackathon |
| NFT badges | ✅ Ship (stretch) | Add last; not required for demo |
| Mobile native app | ❌ Cut | Responsive web is enough |
| Minimum pool duration | 5 minutes | For demo completability on stage |

---

## 14. Demo Script (3-minute video)

**Setup before recording:**
- Two browser windows open: Creator (Window A) + Friend (Window B)
- Both logged into Privy with test wallets
- Both wallets funded with devnet USDC
- Pool created in advance with 4-minute timer (so it expires on camera)

**Script:**
```
[0:00] Window A — Login with email via Privy. Wallet auto-appears.

[0:20] Chat UI — Type "I want to finally go to the gym"
       AI asks: "How many times? What counts as proof?"
       User responds: "12 times, gym selfie each time"
       AI returns measurable goal. [CREATE GOAL] button appears.

[0:50] Click CREATE GOAL. Set stake: 10 USDC, duration: 5 min.
       Pool deploys. Invite link appears.

[1:10] Window B — Friend opens invite link. Joins & stakes.
       Window A dashboard shows 2 participants, timer counting down.

[1:30] Window A — Click "Submit Proof". Upload gym photo.
       AI verdict appears: "Pass — cardio machine visible, 24:13 elapsed."
       Tile flips green.

[1:50] Timer hits zero. "Settle Pool" button appears.
       Click → pool settles → Window A sees winnings: 20 USDC.
       NFT badge minted. "First Win" badge visible.

[2:10] Click "Claim". Transaction signed. USDC in wallet.

[2:20] Show Supabase dashboard — pools, evidence, badges rows live.

[2:30] End card: Stru. Bet on yourself.
```

---

## 15. Build Priority (48 hours)

```
Hour 0–8   : Anchor program — create_pool, join_pool, mark_complete, settle_pool
Hour 8–12  : Supabase schema + storage bucket setup
Hour 12–16 : Privy auth in Next.js + basic routing
Hour 16–22 : Backend — goalAgent + verifyAgent + x402 middleware
Hour 22–30 : Frontend — GoalChat, PoolDashboard, ProofSubmit, ClaimButton
Hour 30–36 : Wire everything together, full flow working end-to-end
Hour 36–42 : NFT badge minting (stretch)
Hour 42–46 : README, .env.example, deploy to devnet, record demo video
Hour 46–48 : Buffer / polish / submit
```
