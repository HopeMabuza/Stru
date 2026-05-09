import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import IDL from "./stru_idl.json";

const PROGRAM_ID = new PublicKey("JBotr6E6aQvKRwR9vBzT4C3uRzVj9x3mvW7SRAe71o8Y");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6;
const textEncoder = new TextEncoder();

export const connection = new Connection("https://api.devnet.solana.com", "confirmed");

function parsePublicKey(value: string, label: string): PublicKey {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is missing.`);
  }

  if (normalized === "pending") {
    throw new Error(
      `${label} is still pending. This pool is missing a finalized on-chain address.`,
    );
  }

  try {
    return new PublicKey(normalized);
  } catch {
    throw new Error(`${label} is invalid. Expected a base58 Solana address.`);
  }
}

function getProgram(walletPubkey: PublicKey) {
  const wallet = {
    publicKey: walletPubkey,
    signTransaction: async <T extends Transaction>(tx: T) => tx,
    signAllTransactions: async <T extends Transaction>(txs: T[]) => txs,
  };
  const provider = new anchor.AnchorProvider(connection, wallet as anchor.Wallet, {
    commitment: "confirmed",
  });
  return new anchor.Program(IDL as unknown as anchor.Idl, provider);
}

function getVaultPda(poolPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("vault"), poolPda.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

function getParticipantPda(poolPda: PublicKey, wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [textEncoder.encode("participant"), poolPda.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

function usdcToLamports(usdc: number): anchor.BN {
  return new anchor.BN(Math.round(usdc * 10 ** USDC_DECIMALS));
}

function getPhantom() {
  const phantom =
    (window as unknown as { phantom?: { solana?: unknown }; solana?: unknown }).phantom
      ?.solana ??
    (window as unknown as { solana?: unknown }).solana;
  if (!phantom) throw new Error("Phantom wallet not found. Please install Phantom.");
  return phantom as {
    signAndSendTransaction(tx: Transaction): Promise<{ signature: string }>;
  };
}

async function buildAndSend(tx: Transaction, walletPubkey: PublicKey): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = walletPubkey;
  const phantom = getPhantom();
  const { signature } = await phantom.signAndSendTransaction(tx);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

/** Called by create.tsx after api.goalCreate() succeeds */
export async function onChainCreatePool(params: {
  walletAddress: string;
  poolPda: string;
  goalHash: number[];
  stakeUsdc: number;
  budgetUsdc: number;
  durationSecs: number;
  poolIdU64: number;
}): Promise<string> {
  const walletPubkey = parsePublicKey(params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(params.poolPda, "Pool address");
  const vaultPda = getVaultPda(poolPda);
  const creatorTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, walletPubkey);

  const program = getProgram(walletPubkey);
  const tx = await program.methods
    .createPool(
      params.goalHash,
      usdcToLamports(params.stakeUsdc),
      usdcToLamports(params.budgetUsdc),
      new anchor.BN(params.durationSecs),
      new anchor.BN(params.poolIdU64),
    )
    .accounts({
      pool: poolPda,
      creator: walletPubkey,
      mint: USDC_MINT,
      creatorTokenAccount,
      poolVault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return buildAndSend(tx, walletPubkey);
}

/** Called by PoolDashboard.tsx join() before hitting the backend */
export async function onChainJoinPool(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const walletPubkey = parsePublicKey(params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(params.poolPda, "Pool address");
  const vaultPda = getVaultPda(poolPda);
  const participantPda = getParticipantPda(poolPda, walletPubkey);
  const participantTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, walletPubkey);

  const program = getProgram(walletPubkey);
  const tx = await program.methods
    .joinPool()
    .accounts({
      pool: poolPda,
      participant: participantPda,
      participantWallet: walletPubkey,
      participantTokenAccount,
      poolVault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return buildAndSend(tx, walletPubkey);
}

/** Permissionless — anyone can call after deadline. Frontend calls this then POST /pool/:id/settle */
export async function onChainSettlePool(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const walletPubkey = parsePublicKey(params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(params.poolPda, "Pool address");
  const vaultPda = getVaultPda(poolPda);

  const program = getProgram(walletPubkey);
  const tx = await program.methods
    .settlePool()
    .accounts({
      pool: poolPda,
      poolVault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  return buildAndSend(tx, walletPubkey);
}

/** Winner calls this to pull USDC to their wallet */
export async function onChainClaim(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const walletPubkey = parsePublicKey(params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(params.poolPda, "Pool address");
  const vaultPda = getVaultPda(poolPda);
  const participantPda = getParticipantPda(poolPda, walletPubkey);
  const winnerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, walletPubkey);

  const program = getProgram(walletPubkey);
  const tx = await program.methods
    .claim()
    .accounts({
      pool: poolPda,
      participant: participantPda,
      poolVault: vaultPda,
      winnerTokenAccount,
      winner: walletPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  return buildAndSend(tx, walletPubkey);
}
