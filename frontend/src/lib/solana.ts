import IDL from "./stru_idl.json";

type Web3Module = typeof import("@solana/web3.js");
type AnchorModule = typeof import("@coral-xyz/anchor");
type PublicKey = import("@solana/web3.js").PublicKey;
type Transaction = import("@solana/web3.js").Transaction;

interface SolanaRuntime {
  web3: Web3Module;
  anchor: AnchorModule;
  connection: import("@solana/web3.js").Connection;
  programId: PublicKey;
}

function envOrFallback(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw || fallback;
}

const SOLANA_RPC_URL = envOrFallback(
  import.meta.env.VITE_SOLANA_RPC_URL,
  "https://api.devnet.solana.com",
);
const SOL_DECIMALS = 9;
const POOL_STAKE_OFFSET = 8 + 32 + 32;
const MIN_CREATE_SOL_LAMPORTS = 20_000_000;
const MIN_JOIN_SOL_LAMPORTS = 5_000_000;
const textEncoder = new TextEncoder();

let runtimePromise: Promise<SolanaRuntime> | null = null;

async function loadSolana(): Promise<SolanaRuntime> {
  runtimePromise ??= (async () => {
    await import("./browser-polyfills");
    const [web3, anchor] = await Promise.all([
      import("@solana/web3.js"),
      import("@coral-xyz/anchor"),
    ]);
    const programId = new web3.PublicKey(
      envOrFallback(import.meta.env.VITE_PROGRAM_ID, "qaAZkoNtDGzZreJkdAyrg8D2TxhWtXG4D21RfuF2TBf"),
    );
    const connection = new web3.Connection(SOLANA_RPC_URL, "confirmed");
    return { web3, anchor, connection, programId };
  })();
  return runtimePromise;
}

function parsePublicKey(web3: Web3Module, value: string, label: string): PublicKey {
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
    return new web3.PublicKey(normalized);
  } catch {
    throw new Error(`${label} is invalid. Expected a base58 Solana address.`);
  }
}

function getProgram(runtime: SolanaRuntime, walletPubkey: PublicKey) {
  const idl = {
    ...(IDL as Record<string, unknown>),
    address: runtime.programId.toBase58(),
  };
  const wallet = {
    publicKey: walletPubkey,
    signTransaction: async <T extends Transaction>(tx: T) => tx,
    signAllTransactions: async <T extends Transaction>(txs: T[]) => txs,
  };
  const provider = new runtime.anchor.AnchorProvider(
    runtime.connection,
    wallet as import("@coral-xyz/anchor").Wallet,
    {
    commitment: "confirmed",
    },
  );
  return new runtime.anchor.Program(idl as unknown as import("@coral-xyz/anchor").Idl, provider);
}

function getParticipantPda(runtime: SolanaRuntime, poolPda: PublicKey, wallet: PublicKey): PublicKey {
  const [pda] = runtime.web3.PublicKey.findProgramAddressSync(
    [textEncoder.encode("participant"), poolPda.toBuffer(), wallet.toBuffer()],
    runtime.programId,
  );
  return pda;
}

function getPoolPda(runtime: SolanaRuntime, creator: PublicKey, poolIdU64: number): PublicKey {
  const poolIdSeed = new Uint8Array(8);
  new DataView(poolIdSeed.buffer).setBigUint64(0, BigInt(poolIdU64), true);
  const [pda] = runtime.web3.PublicKey.findProgramAddressSync(
    [textEncoder.encode("pool"), creator.toBuffer(), poolIdSeed],
    runtime.programId,
  );
  return pda;
}

function assertPoolPdaMatches(runtime: SolanaRuntime, actual: PublicKey, creator: PublicKey, poolIdU64: number) {
  const expected = getPoolPda(runtime, creator, poolIdU64);
  if (!expected.equals(actual)) {
    throw new Error(
      `Pool PDA mismatch. Frontend is using program ${runtime.programId.toBase58()}, but the backend returned a PDA for a different program. Update VITE_PROGRAM_ID and backend PROGRAM_ID to the same deployed address.`,
    );
  }
}

function solToLamports(anchor: AnchorModule, sol: number): import("@coral-xyz/anchor").BN {
  return new anchor.BN(Math.round(sol * 10 ** SOL_DECIMALS));
}

function solToLamportsBigInt(sol: number): bigint {
  return BigInt(Math.round(sol * 10 ** SOL_DECIMALS));
}

function formatSolLamports(lamports: bigint): string {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
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
    return "Transaction simulation failed because the wallet does not have enough devnet SOL.";
  }
  if (text.includes("accountnotinitialized") || text.includes("account not initialized")) {
    return "Transaction simulation failed because a required on-chain account is not initialized.";
  }
  if (text.includes("pool deadline has passed")) {
    return "This pool has already expired.";
  }
  return null;
}

async function preflightCreatePool(runtime: SolanaRuntime, params: {
  walletPubkey: PublicKey;
  stakeSol: number;
  budgetSol: number;
}): Promise<void> {
  const solBalance = await runtime.connection.getBalance(params.walletPubkey, "confirmed");
  const totalRequired = solToLamportsBigInt(params.stakeSol + params.budgetSol);
  const minimumBalance = totalRequired + BigInt(MIN_CREATE_SOL_LAMPORTS);

  if (BigInt(solBalance) < minimumBalance) {
    throw new Error(
      `Your wallet has ${formatSolLamports(BigInt(solBalance))} SOL, but creating a pool requires ` +
        `${formatSolLamports(totalRequired)} SOL plus a small fee/rent buffer.`,
    );
  }
}

async function preflightJoinPool(runtime: SolanaRuntime, params: {
  walletPubkey: PublicKey;
  poolPda: PublicKey;
  participantPda: PublicKey;
}): Promise<"needs-join" | "already-joined"> {
  const [solBalance, poolAccount, participantAccount] = await Promise.all([
    runtime.connection.getBalance(params.walletPubkey, "confirmed"),
    runtime.connection.getAccountInfo(params.poolPda, "confirmed"),
    runtime.connection.getAccountInfo(params.participantPda, "confirmed"),
  ]);

  if (!poolAccount) {
    throw new Error(
      "This pool was saved in the app, but its on-chain account does not exist yet. Ask the creator to recreate the pool and confirm the create transaction.",
    );
  }

  if (participantAccount) return "already-joined";

  const requiredStake = readPoolStakeAmount(poolAccount.data);
  const minimumBalance = requiredStake + BigInt(MIN_JOIN_SOL_LAMPORTS);
  if (BigInt(solBalance) < minimumBalance) {
    throw new Error(
      `Your wallet has ${formatSolLamports(BigInt(solBalance))} SOL, but joining requires ` +
        `${formatSolLamports(requiredStake)} SOL plus a small fee/rent buffer.`,
    );
  }

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

async function buildAndSend(runtime: SolanaRuntime, tx: Transaction, walletPubkey: PublicKey): Promise<string> {
  const { blockhash } = await runtime.connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = walletPubkey;
  const simulation = await runtime.connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error(
      simulationMessage(simulation.value.logs) ??
        `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }
  const phantom = getPhantom();
  try {
    const { signature } = await phantom.signAndSendTransaction(tx);
    await runtime.connection.confirmTransaction(signature, "confirmed");
    return signature;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/unexpected error/i.test(message)) {
      throw new Error(
        "Phantom could not send the transaction. Make sure Phantom is connected to Solana devnet and the wallet has enough devnet SOL.",
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
  stakeSol: number;
  budgetSol: number;
  durationSecs: number;
  poolIdU64: number;
}): Promise<string> {
  const runtime = await loadSolana();
  const walletPubkey = parsePublicKey(runtime.web3, params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(runtime.web3, params.poolPda, "Pool address");
  assertPoolPdaMatches(runtime, poolPda, walletPubkey, params.poolIdU64);

  await preflightCreatePool(runtime, {
    walletPubkey,
    stakeSol: params.stakeSol,
    budgetSol: params.budgetSol,
  });

  const program = getProgram(runtime, walletPubkey);
  const tx = await program.methods
    .createPool(
      params.goalHash,
      solToLamports(runtime.anchor, params.stakeSol),
      solToLamports(runtime.anchor, params.budgetSol),
      new runtime.anchor.BN(params.durationSecs),
      new runtime.anchor.BN(params.poolIdU64),
    )
    .accounts({
      pool: poolPda,
      creator: walletPubkey,
      systemProgram: runtime.web3.SystemProgram.programId,
      rent: runtime.web3.SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return buildAndSend(runtime, tx, walletPubkey);
}

/** Called by PoolDashboard.tsx join() before hitting the backend */
export async function onChainJoinPool(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const runtime = await loadSolana();
  const walletPubkey = parsePublicKey(runtime.web3, params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(runtime.web3, params.poolPda, "Pool address");
  const participantPda = getParticipantPda(runtime, poolPda, walletPubkey);

  const joinState = await preflightJoinPool(runtime, {
    walletPubkey,
    poolPda,
    participantPda,
  });
  if (joinState === "already-joined") return "already-joined-on-chain";

  const program = getProgram(runtime, walletPubkey);
  const tx = await program.methods
    .joinPool()
    .accounts({
      pool: poolPda,
      participant: participantPda,
      participantWallet: walletPubkey,
      systemProgram: runtime.web3.SystemProgram.programId,
      rent: runtime.web3.SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return buildAndSend(runtime, tx, walletPubkey);
}

/** Permissionless — anyone can call after deadline. Frontend calls this then POST /pool/:id/settle */
export async function onChainSettlePool(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const runtime = await loadSolana();
  const walletPubkey = parsePublicKey(runtime.web3, params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(runtime.web3, params.poolPda, "Pool address");

  const program = getProgram(runtime, walletPubkey);
  const tx = await program.methods
    .settlePool()
    .accounts({
      pool: poolPda,
    })
    .transaction();

  return buildAndSend(runtime, tx, walletPubkey);
}

/** Winner calls this to pull SOL to their wallet */
export async function onChainClaim(params: {
  walletAddress: string;
  poolPda: string;
}): Promise<string> {
  const runtime = await loadSolana();
  const walletPubkey = parsePublicKey(runtime.web3, params.walletAddress, "Wallet address");
  const poolPda = parsePublicKey(runtime.web3, params.poolPda, "Pool address");
  const participantPda = getParticipantPda(runtime, poolPda, walletPubkey);

  const program = getProgram(runtime, walletPubkey);
  const tx = await program.methods
    .claim()
    .accounts({
      pool: poolPda,
      participant: participantPda,
      winner: walletPubkey,
    })
    .transaction();

  return buildAndSend(runtime, tx, walletPubkey);
}
