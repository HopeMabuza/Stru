# Stru

**Bet on yourself. Get paid when your friends flake.**

Stru is a Solana accountability app where a group of friends stakes into a shared pool, commits to a measurable goal, submits proof, and lets an AI referee decide who actually completed it. When the deadline hits, winners split the pot and can claim their winnings on-chain.

This repository contains the hackathon/demo build of Stru.

> **Important:** The current codebase differs slightly from the original product spec in `CLAUDE.md`.
> Today, this repo uses **Phantom**, **Gemini**, **SOL on devnet**, and a **demo x402 stub** rather than the planned Privy + Claude + USDC production flow.

## What works in this repo

- AI-assisted goal refinement via the backend goal agent
- Pool creation stored in Supabase and initialized on-chain via Anchor
- Join flow with on-chain `join_pool`
- Proof upload to Supabase Storage
- AI verification with Gemini vision/file input
- Oracle-triggered `mark_complete` after successful verification
- On-chain settlement and winner claims
- Devnet SOL faucet endpoint for demo wallets

## Current stack

- **Frontend:** Vite + React + TanStack Router + Tailwind
- **Backend:** Express + TypeScript
- **On-chain:** Anchor + Rust on Solana
- **Database / storage:** Supabase Postgres + Storage
- **Wallet:** Phantom
- **AI:** Google Gemini (`gemini-2.0-flash` by default)

## Architecture

1. The frontend chats with the backend to turn a vague goal into a measurable one.
2. The backend stores the pool draft in Supabase and returns the PDA + goal hash.
3. The frontend signs the Anchor `create_pool` transaction with Phantom.
4. Friends join by signing `join_pool`, then the backend records the participant row.
5. Proof is uploaded to `POST /verify`, stored in Supabase Storage, and checked by Gemini.
6. Passing proof updates Supabase and triggers on-chain `mark_complete` through the oracle wallet.
7. After expiry, anyone can settle the pool on-chain; winners then claim their SOL.

## Repository layout

```text
.
├── backend/            # Express API, Gemini agents, verification flow
├── frontend/           # Vite/React app
├── programs/stru/      # Anchor program
├── supabase/schema.sql # Database schema + RLS policies
├── tests/              # Anchor test suite
├── CLAUDE.md           # Canonical product/architecture spec
└── DEPLOY.md           # Devnet deployment notes
```

## Core on-chain instructions

The Anchor program currently exposes:

- `create_pool`
- `join_pool`
- `mark_complete`
- `settle_pool`
- `claim`
- `mint_badge`

## Prerequisites

Before running locally, make sure you have:

- **Node.js** 20+
- **npm**
- **Rust** + Cargo
- **Solana CLI** configured for devnet
- **Anchor CLI**
- A **Supabase** project
- A **Gemini API key**
- **Phantom** installed in your browser and set to **Devnet**

## Local setup

### 1. Install dependencies

From the repo root:

- `npm install`
- `cd backend && npm install`
- `cd frontend && npm install`

### 2. Create your environment file

Copy the template and fill in the values:

- `cp .env.example .env`

Important variables:

- `GEMINI_API_KEY` — required for live AI calls
- `AI_DEMO_FALLBACK` — set to `true` to allow demo fallback when Gemini quota/model access fails
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_EVIDENCE_BUCKET` — defaults to `evidence`
- `ANCHOR_PROVIDER_URL` — usually `https://api.devnet.solana.com`
- `PROGRAM_ID` — deployed Anchor program ID used by the backend
- `VITE_PROGRAM_ID` — same program ID used by the frontend
- `VITE_SOLANA_RPC_URL` — frontend RPC endpoint
- `ORACLE_WALLET_PRIVATE_KEY` — base58 secret key used for `mark_complete`
- `NEXT_PUBLIC_APP_URL` — app origin for invite links
- `VERIFY_PRICE_SOL` — demo verification cost tracked by the x402 stub
- `SOL_AIRDROP_AMOUNT` — faucet amount for devnet testing

### 3. Set up Supabase

1. Create a new Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a public storage bucket named `evidence`.

The backend will attempt to create the storage bucket automatically if it does not exist, but creating it explicitly is still recommended.

### 4. Start the backend

- `cd backend`
- `npm run dev`

The backend runs on port `4000` by default.

Health check:

- `GET http://localhost:4000/health`

### 5. Start the frontend

In a separate terminal:

- `cd frontend`
- `npm run dev`

By default the frontend points at `http://localhost:4000` unless you override `VITE_BACKEND_URL`.

### 6. Build / test the Anchor program

From the repo root:

- `anchor build`
- `anchor test`

## Frontend routes

- `/` — landing page
- `/create` — goal chat + pool creation
- `/dashboard` — connected wallet's pools
- `/pool/:id` — pool detail, join, submit proof, settle, claim

## Backend routes

- `POST /users` — upsert user by wallet
- `POST /goal/chat` — goal refinement chat
- `POST /goal/create` — create pool metadata and return PDA details
- `GET /pool` — list pools
- `GET /pool/:id` — pool + participants
- `POST /pool/:id/join` — record participant after on-chain join
- `POST /pool/:id/activate` — mark pool active after on-chain create
- `POST /pool/:id/cancel` — cancel failed/pending pool creation
- `POST /pool/:id/settle` — mark pool settled in Supabase
- `POST /verify` — upload proof and run AI verification
- `POST /faucet/sol` — airdrop devnet SOL for demo wallets
- `GET /health` — backend health endpoint

## Demo flow

1. Connect Phantom on devnet.
2. Use the create page to chat with the goal coach.
3. Lock in stake + duration and sign the `create_pool` transaction.
4. Share the invite link.
5. A friend joins and signs `join_pool`.
6. Submit an image or PDF as proof.
7. Gemini returns a pass/fail verdict with reasoning.
8. After the deadline, settle the pool on-chain.
9. Winners click claim to pull their SOL.

## Development notes and caveats

- **SOL, not USDC:** the current demo uses SOL-denominated stake and verification pricing for simplicity on devnet.
- **Phantom, not Privy:** wallet auth is currently Phantom-only in the frontend.
- **Gemini, not Claude:** the AI agents are implemented with `@google/generative-ai`.
- **x402 is stubbed:** `backend/src/x402/middleware.ts` tracks demo spend in memory and auto-approves verification requests.
- **User auth is wallet-based:** the backend still synthesizes `privy_id` values in Supabase until Privy is wired in.
- **Badges are scaffolded:** badge schema and on-chain instruction exist, but full automated minting is not yet wired end-to-end in the current backend/frontend flow.
- **Program IDs must match:** keep `programs/stru/src/lib.rs`, `Anchor.toml`, `frontend/src/lib/stru_idl.json`, `PROGRAM_ID`, and `VITE_PROGRAM_ID` aligned.

## Useful commands

### Root / Anchor

- `anchor build`
- `anchor test`

### Backend

- `cd backend && npm run dev`
- `cd backend && npm run build`
- `cd backend && npm run start`

### Frontend

- `cd frontend && npm run dev`
- `cd frontend && npm run build`
- `cd frontend && npm run preview`
- `cd frontend && npm run lint`

## Deployment

- See `DEPLOY.md` for deployment notes.
- If you redeploy the program, update every place that depends on the program ID and regenerated IDL.

## Status

This repo is a strong hackathon/demo implementation of the Stru concept:

- measurable AI-defined goals
- on-chain pools and payouts
- AI proof verification
- Supabase-backed app state
- a usable end-to-end devnet demo flow

If you want to move it toward production, the next major steps are:

1. replace Phantom-only auth with Privy
2. move from SOL to SPL token / USDC staking
3. replace the x402 stub with real payment middleware
4. finish badge mint automation
5. tighten auth, validation, and monitoring around backend routes