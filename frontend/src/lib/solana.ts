import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import IDL from "./stru_idl.json";

const PROGRAM_ID = new PublicKey("JBotr6E6aQvKRwR9vBzT4C3uRzVj9x3mvW7SRAe71o8Y");
// Update this after running: POST /faucet/setup
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6;
const POOL_STAKE_OFFSET = 8 + 32 + 32;
const MIN_CREATE_SOL_LAMPORTS = 20_000_000;
const MIN_JOIN_SOL_LAMPORTS = 5_000_000;
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

function usdcToLamportsBigInt(usdc: number): bigint {
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
}

function formatUsdcLamports(lamports: bigint): string {
  const whole = lamports / 1_000_000n;
  const fraction = (lamports % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function readPoolStakeAmount(data: Uint8Array): bigint {
  if (data.length < POOL_STAKE_OFFSET + 8) {
    throw new Error("Pool account data is invalid. The on-chain program may be out of sync.");
  }
  const view = new DataView(data.buffer, data.byteOffset + POOL_STAKE_OFFSET, 8);
  return view.getBigUint64(0, true);
}

function simulationMessage(logs?: string[] | null): string | null {
  const text = logs?.join("\n").toLowerCase() ?? "";
  if (!text) return null;
  if (text.includes("insufficient funds") || text.includes("attempt to debit")) {
    return "Transaction simulation failed because the wallet does not have enough devnet SOL or USDC.";
  }
  if (text.includes("accountnotinitialized") || text.includes("account not initialized")) {
    return "Transaction simulation failed because a required on-chain account is not initialized.";
  }
  if (text.includes("pool deadline has passed")) {
    return "This pool has already expired.";
  }
  return null;
}

const USDC_FAUCET_HINT = `Get devnet USDC at https://faucet.circle.com — make sure to select "Solana Devnet" and use mint ${USDC_MINT.toBase58()}.`;

async function checkUsdcTokenAccount(
  tokenAccountAddress: PublicKey,
  requiredLamports: bigint,
  action: "creating a pool" | "joining",
): Promise<void> {
  let tokenAccount;
  try {
    tokenAccount = await getAccount(connection, tokenAccountAddress, "confirmed");
  } catch {
    throw new Error(
      `Your wallet does not have a devnet USDC token account for ${USDC_MINT.toBase58()}. ` +
        `Fund it with devnet USDC before ${action}. ${USDC_FAUCET_HINT}`,
    );
  }

  if (!tokenAccount.mint.equals(USDC_MINT)) {
    throw new Error(
      `Your devnet USDC token account uses a different mint than this app expects (${USDC_MINT.toBase58()}). ` +
        USDC_FAUCET_HINT,
    );
  }

  if (tokenAccount.amount < requiredLamports) {
    throw new Error(
      `Your wallet has ${formatUsdcLamports(tokenAccount.amount)} devnet USDC, but ${action} requires ${formatUsdcLamports(requiredLamports)} USDC.`,
    );
  }
}

async function preflightCreatePool(params: {
  walletPubkey: PublicKey;
  creatorTokenAccount: PublicKey;
  stakeUsdc: number;
  budgetUsdc: number;
}): Promise<void> {
  const solBalance = await connection.getBalance(params.walletPubkey, "confirmed");
  if (solBalance < MIN_JOIN_SOL_LAMPORTS) {
    throw new Error(
      "Your wallet needs at least 0.005 devnet SOL for transaction fees and account rent.",
    );
  }

  const totalRequired = usdcToLamports(params.stakeUsdc + params.budgetUsdc);
  await checkUsdcTokenAccount(
    params.creatorTokenAccount,
    BigInt(totalRequired.toString()),
    "creating a pool",
  );
}

async function preflightJoinPool(params: {
  walletPubkey: PublicKey;
  poolPda: PublicKey;
  participantPda: PublicKey;
  participantTokenAccount: PublicKey;
}): Promise<"needs-join" | "already-joined"> {
  const [solBalance, poolAccount, participantAccount] = await Promise.all([
    connection.getBalance(params.walletPubkey, "confirmed"),
    connection.getAccountInfo(params.poolPda, "confirmed"),
    connection.getAccountInfo(params.participantPda, "confirmed"),
  ]);

  if (solBalance < MIN_JOIN_SOL_LAMPORTS) {
    throw new Error(
      "Your wallet needs at least 0.005 devnet SOL for join transaction fees and account rent.",
    );
  }

  if (!poolAccount) {
    throw new Error(
      "This pool was saved in the app, but its on-chain account does not exist yet. Ask the creator to recreate the pool and confirm the create transaction.",
    );
  }

  if (participantAccount) return "already-joined";

  const requiredStake = readPoolStakeAmount(poolAccount.data);
  await checkUsdcTokenAccount(params.participantTokenAccount, requiredStake, "joining");

  return "needs-join";
}

function getPhantom() {
  const phantom =
    (window as unknown as { phantom?: { solana?: unknown }; solana?: unknown }).phantom?.solana ??
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
  const simulation = await connection.simulateTransaction(tx, {
    commitment: "confirmed",
    sigVerify: false,
  });
  if (simulation.value.err) {
    throw new Error(
      simulationMessage(simulation.value.logs) ??
        `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }
  const phantom = getPhantom();
  try {
    const { signature } = await phantom.signAndSendTransaction(tx);
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/unexpected error/i.test(message)) {
      throw new Error(
        "Phantom could not send the transaction. Make sure Phantom is connected to Solana devnet and the wallet has enough devnet SOL and USDC.",
      );
    }
    throw e;
  }
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

  await preflightCreatePool({
    walletPubkey,
    creatorTokenAccount,
    stakeUsdc: params.stakeUsdc,
    budgetUsdc: params.budgetUsdc,
  });

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

  const joinState = await preflightJoinPool({
    walletPubkey,
    poolPda,
    participantPda,
    participantTokenAccount,
  });
  if (joinState === "already-joined") return "already-joined-on-chain";

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
