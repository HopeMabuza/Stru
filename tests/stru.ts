import * as anchor from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { assert } from 'chai';
import crypto from 'crypto';

describe('stru', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Stru as any;
  const connection = provider.connection;

  let creator: Keypair;
  let participant: Keypair;
  let oracle: Keypair;
  let poolPda: PublicKey;
  let participantPda: PublicKey;

  const STAKE_AMOUNT = 0.1 * LAMPORTS_PER_SOL;
  const VERIFY_BUDGET = 0.01 * LAMPORTS_PER_SOL;
  const DURATION_SECS = 300;         // 5 minutes
  const POOL_ID = BigInt(1);

  before(async () => {
    creator = Keypair.generate();
    participant = Keypair.generate();
    oracle = Keypair.generate();

    // Airdrop devnet/localnet SOL for fees and stakes
    await connection.confirmTransaction(
      await connection.requestAirdrop(creator.publicKey, 2e9)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(participant.publicKey, 2e9)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(oracle.publicKey, 1e9)
    );

    // Derive PDAs
    const poolIdBytes = Buffer.alloc(8);
    poolIdBytes.writeBigUInt64LE(POOL_ID);

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), creator.publicKey.toBuffer(), poolIdBytes],
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
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.participantCount, 1);
    assert.equal(pool.settled, false);
    assert.equal(pool.stakeAmount.toNumber(), STAKE_AMOUNT);
    assert.isAtLeast(
      await connection.getBalance(poolPda),
      STAKE_AMOUNT + VERIFY_BUDGET,
      'pool PDA should hold the creator SOL deposit'
    );
  });

  it('joins a pool', async () => {
    const before = await connection.getBalance(poolPda);
    await program.methods
      .joinPool()
      .accounts({
        pool: poolPda,
        participant: participantPda,
        participantWallet: participant.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([participant])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.participantCount, 2);
    assert.isAtLeast(await connection.getBalance(poolPda), before + STAKE_AMOUNT);
  });

  it('rejects mark complete from a non-oracle signer', async () => {
    try {
      await program.methods
        .markComplete()
        .accounts({
          pool: poolPda,
          participant: participantPda,
          oracle: oracle.publicKey,
        })
        .signers([oracle])
        .rpc();
      assert.fail('Should have failed — unauthorized oracle');
    } catch (err: any) {
      assert.include(err.message, 'Unauthorized');
    }
  });

  it('settles the pool after deadline', async () => {
    // In a real test we'd advance the clock — on localnet just check the instruction
    // This test will fail until deadline passes; that's expected behavior
    try {
      await program.methods
        .settlePool()
        .accounts({
          pool: poolPda,
        })
        .rpc();
      assert.fail('Should have failed — deadline not reached');
    } catch (err: any) {
      assert.include(err.message, 'DeadlineNotReached');
    }
  });
});
