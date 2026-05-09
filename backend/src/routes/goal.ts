import { Router, Request, Response } from 'express';
import { chatWithGoalAgent } from '../ai/goalAgent';
import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

const router = Router();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /goal/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history: { role: 'user' | 'model'; content: string }[];
    };

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await chatWithGoalAgent(message, history || []);
    return res.json(result);
  } catch (err) {
    console.error('goal/chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /goal/create
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { goal, stake_amount, duration_secs, creator_wallet } = req.body as {
      goal: {
        description: string;
        proof_type: string;
        threshold: number;
        unit: string;
        verifiable: boolean;
      };
      stake_amount: number;
      duration_secs: number;
      creator_wallet: string;
    };

    if (!goal || !stake_amount || !duration_secs || !creator_wallet) {
      return res.status(400).json({ error: 'goal, stake_amount, duration_secs, creator_wallet required' });
    }

    // Hash the goal JSON for on-chain storage
    const goalJson = JSON.stringify(goal);
    const goalHash = Array.from(crypto.createHash('sha256').update(goalJson).digest());

    // Upsert the creator as a user (privy_id stubbed until Privy is wired in)
    let creatorId: string | null = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', creator_wallet)
      .maybeSingle();

    if (existingUser) {
      creatorId = existingUser.id;
    } else {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ wallet_address: creator_wallet, privy_id: `stub_${creator_wallet}` })
        .select('id')
        .single();
      if (userError) throw userError;
      creatorId = newUser.id;
    }

    // Compute the on-chain pool PDA so we can store it in Supabase now
    const poolIdU64 = Date.now(); // u64 seed; safe as JS number (< 2^53)
    const programId = new PublicKey(process.env.PROGRAM_ID!);
    const creatorPubkey = new PublicKey(creator_wallet);
    const poolIdBuf = Buffer.alloc(8);
    poolIdBuf.writeBigUInt64LE(BigInt(poolIdU64));
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), creatorPubkey.toBuffer(), poolIdBuf],
      programId,
    );

    // Insert pool into Supabase first to get UUID
    const deadline = new Date(Date.now() + duration_secs * 1000);
    const { data: poolRow, error: dbError } = await supabase
      .from('pools')
      .insert({
        program_pda: poolPda.toBase58(),
        goal_text: goal.description,
        goal_json: goal,
        stake_amount,
        budget: stake_amount * 0.1,
        deadline: deadline.toISOString(),
        status: 'active',
        creator_id: creatorId,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const poolId = poolRow.id;
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/pool/${poolId}`;

    // Auto-join the creator as a participant
    await supabase
      .from('participants')
      .insert({ pool_id: poolId, wallet_address: creator_wallet, status: 'pending' });

    return res.json({
      pool_id: poolId,
      pool_pda: poolPda.toBase58(),
      invite_link: inviteLink,
      goal_hash: goalHash,
      pool_id_u64: poolIdU64, // frontend uses this to sign the create_pool instruction
    });
  } catch (err) {
    console.error('goal/create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
