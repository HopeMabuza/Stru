# Stru — Devnet Deployment

## What this is

The Stru Anchor program has been successfully compiled and deployed to the **Solana devnet**. This means the on-chain logic (pool creation, staking, AI verification, settlement, and payouts) is live and callable.

---

## Deployment Details

| Field | Value |
|---|---|
| **Network** | Solana Devnet |
| **Program ID** | `qaAZkoNtDGzZreJkdAyrg8D2TxhWtXG4D21RfuF2TBf` |
| **IDL Metadata Account** | `7CDqPN43KWMgFR3pbBT8RzDpZUsHKNp9XeWRbLce8QLU` |
| **Upgrade Authority** | Oracle keypair (`keypairs/oracle.json`) |
| **Oracle Pubkey** | `HyVe1fm8c35hoGCR6ZR9PjtLN9pahQ2EAZpbz1oh74ao` |

---

## What "Program ID" means

The Program ID is the on-chain address of the Stru smart contract. Every pool, stake, and settlement transaction references this address. It's already saved in `.env` as `PROGRAM_ID`.

The **IDL metadata account** stores the program's interface definition on-chain — this is what lets the frontend and backend talk to the program without needing a local copy of the IDL file.

---

## Re-deploying

If you make changes to the Rust program and need to redeploy:

```bash
anchor build
anchor program deploy --provider.cluster devnet
```

> The Program ID stays the same on upgrades (same upgrade authority keypair).

---

## Verify on Explorer

View the live program on Solana Explorer:
https://explorer.solana.com/address/qaAZkoNtDGzZreJkdAyrg8D2TxhWtXG4D21RfuF2TBf?cluster=devnet
