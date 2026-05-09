import { Router, Request, Response } from 'express';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import bs58 from 'bs58';

const router = Router();
const connection = new Connection(
  process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com',
  'confirmed',
);

function getMintAuthority(): Keypair {
  const key = process.env.ORACLE_WALLET_PRIVATE_KEY;
  if (!key) throw new Error('ORACLE_WALLET_PRIVATE_KEY not set');
  return Keypair.fromSecretKey(bs58.decode(key));
}

function getMintAddress(): PublicKey {
  const addr = process.env.USDC_MINT_ADDRESS;
  if (!addr) throw new Error('USDC_MINT_ADDRESS not set. Call POST /faucet/setup first.');
  return new PublicKey(addr);
}

// POST /faucet/setup — create the test USDC mint (one-time, idempotent)
router.post('/setup', async (_req: Request, res: Response) => {
  try {
    if (process.env.USDC_MINT_ADDRESS) {
      return res.json({
        mint: process.env.USDC_MINT_ADDRESS,
        message: 'Mint already configured.',
      });
    }

    const mintAuthority = getMintAuthority();
    console.log('Creating test USDC mint on devnet...');
    const mint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6,
    );
    console.log(`Test USDC mint created: ${mint.toBase58()}`);

    return res.json({
      mint: mint.toBase58(),
      message: `Add USDC_MINT_ADDRESS=${mint.toBase58()} and VITE_USDC_MINT_ADDRESS=${mint.toBase58()} to your .env, then restart.`,
    });
  } catch (err) {
    console.error('faucet/setup error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Setup failed' });
  }
});

// POST /faucet/usdc — airdrop 100 test USDC to a wallet (creates ATA if needed)
router.post('/usdc', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body as { wallet?: string };
    if (!wallet) return res.status(400).json({ error: 'wallet is required' });

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const mintAuthority = getMintAuthority();
    const mint = getMintAddress();

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      walletPubkey,
    );

    // 100 USDC with 6 decimals
    await mintTo(connection, mintAuthority, mint, tokenAccount.address, mintAuthority, 100_000_000);

    return res.json({
      success: true,
      amount: 100,
      tokenAccount: tokenAccount.address.toBase58(),
    });
  } catch (err) {
    console.error('faucet/usdc error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Faucet failed' });
  }
});

export default router;
