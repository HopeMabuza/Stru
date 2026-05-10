import { Router, Request, Response } from 'express';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const router = Router();
const connection = new Connection(
  process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com',
  'confirmed',
);

// POST /faucet/sol — airdrop devnet SOL to a wallet.
router.post('/sol', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body as { wallet?: string };
    if (!wallet) return res.status(400).json({ error: 'wallet is required' });

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const amount = Number(process.env.SOL_AIRDROP_AMOUNT || '2');
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    const signature = await connection.requestAirdrop(walletPubkey, lamports);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latest }, 'confirmed');

    return res.json({
      success: true,
      amount,
      signature,
    });
  } catch (err) {
    console.error('faucet/sol error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'SOL airdrop failed' });
  }
});

export default router;
