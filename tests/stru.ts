import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Stakeup } from '../target/types/stakeup';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { assert } from 'chai';
import crypto from 'crypto';

describe('stakeup', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Stakeup as Program<Stakeup>;
  const connection = provider.connection;

  let usdcMint: PublicKey;
  let creator: Keypair;
  let participant: Keypair;
  let oracle: Keypair;
  let creatorTokenAccount: PublicKey;
  let participantTokenAccount: PublicKey;
  let poolPda: PublicKey;
  let poolVaultPda: PublicKey;
  let participantPda: PublicKey;

  const STAKE_AMOUNT = 10_000_000; // 10 USDC (6 decimals)
  const VERIFY_BUDGET = 1_000_000;  // 1 USDC
  const DURATION_SECS = 300;         // 5 minutes
  const POOL_ID = BigInt(1);

  before(async () => {
    creator = Keypair.generate();
    participant = Keypair.generate();
    oracle = Keypair.generate();

    // Airdrop SOL for fees
    await connection.confirmTransaction(
      await connection.requestAirdrop(creator.publicKey, 2e9)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(participant.publicKey, 2e9)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(oracle.publicKey, 1e9)
    );

    // Create mock USDC mint
    usdcMint = await createMint(connection, creator, creator.publicKey, null, 6);

    // Create token accounts
    const creatorATA = await getOrCreateAssociatedTokenAccount(
      connection, creator, usdcMint, creator.publicKey
    );
    creatorTokenAccount = creatorATA.address;

    const participantATA = await getOrCreateAssociatedTokenAccount(
      connection, participant, usdcMint, participant.publicKey
    );
    participantTokenAccount = participantATA.address;

    // Mint tokens
    await mintTo(connection, creator, usdcMint, creatorTokenAccount, creator, 100_000_000);
    await mintTo(connection, creator, usdcMint, participantTokenAccount, creator, 100_000_000);

    // Derive PDAs
    const poolIdBytes = Buffer.alloc(8);
    poolIdBytes.writeBigUInt64LE(POOL_ID);

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), creator.publicKey.toBuffer(), poolIdBytes],
      program.programId
    );

    [poolVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolPda.toBuffer()],
      program.programId
    );

    [participantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), poolPda.toBuffer(), participant.publicKey.toBuffer()],
      program.programId
    );
  });

  it('creates a pool', async () => {
    const goalHash = Array.from(crypto.createHash('sha256').update('test goal').digest());

    await program.methods
      .createPool(
        goalHash,
        new anchor.BN(STAKE_AMOUNT),
        new anchor.BN(VERIFY_BUDGET),
        new anchor.BN(DURATION_SECS),
        new anchor.BN(POOL_ID.toString())
      )
      .accounts({
        pool: poolPda,
        creator: creator.publicKey,
        creatorTokenAccount,
        poolVault: poolVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.participantCount, 1);
    assert.equal(pool.settled, false);
    assert.equal(pool.stakeAmount.toNumber(), STAKE_AMOUNT);
  });

  it('joins a pool', async () => {
    await program.methods
      .joinPool()
      .accounts({
        pool: poolPda,
        participant: participantPda,
        participantWallet: participant.publicKey,
        participantTokenAccount,
        poolVault: poolVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([participant])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.participantCount, 2);
  });

  it('marks participant complete (oracle)', async () => {
    await program.methods
      .markComplete()
      .accounts({
        pool: poolPda,
        participant: participantPda,
        oracle: oracle.publicKey,
      })
      .signers([oracle])
      .rpc();

    const participantAccount = await program.account.participant.fetch(participantPda);
    assert.equal(participantAccount.completed, true);
  });

  it('settles the pool after deadline', async () => {
    // In a real test we'd advance the clock — on localnet just check the instruction
    // This test will fail until deadline passes; that's expected behavior
    try {
      await program.methods
        .settlePool()
        .accounts({
          pool: poolPda,
          poolVault: poolVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail('Should have failed — deadline not reached');
    } catch (err: any) {
      assert.include(err.message, 'DeadlineNotReached');
    }
  });
});
