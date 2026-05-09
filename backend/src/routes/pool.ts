import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /pool/:id — pool row + participants
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('*')
      .eq('id', id)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    const { data: participants, error: partError } = await supabase
      .from('participants')
      .select('*')
      .eq('pool_id', id)
      .order('joined_at', { ascending: true });

    if (partError) throw partError;

    return res.json({ pool, participants: participants || [] });
  } catch (err) {
    console.error('pool/get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pool — list pools, optional ?wallet=... filter (returns pools where wallet is a participant)
router.get('/', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string | undefined;

    if (wallet) {
      const { data: parts, error: partError } = await supabase
        .from('participants')
        .select('pool_id')
        .eq('wallet_address', wallet);

      if (partError) throw partError;
      const poolIds = (parts || []).map((p) => p.pool_id);
      if (poolIds.length === 0) return res.json([]);

      const { data: pools, error: poolError } = await supabase
        .from('pools')
        .select('*')
        .in('id', poolIds)
        .order('created_at', { ascending: false });

      if (poolError) throw poolError;
      return res.json(pools || []);
    }

    const { data: pools, error } = await supabase
      .from('pools')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json(pools || []);
  } catch (err) {
    console.error('pool/list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pool/:id/join — body: { wallet_address }
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { wallet_address } = req.body as { wallet_address: string };

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('id, deadline, status')
      .eq('id', id)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }
    if (pool.status !== 'active') {
      return res.status(400).json({ error: 'Pool is not active' });
    }
    if (new Date(pool.deadline).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Pool deadline has passed' });
    }

    const { data, error } = await supabase
      .from('participants')
      .upsert(
        { pool_id: id, wallet_address, status: 'pending' },
        { onConflict: 'pool_id,wallet_address' }
      )
      .select()
      .single();

    if (error) throw error;

    // TODO: call Anchor join_pool instruction with the user's wallet here
    return res.json(data);
  } catch (err) {
    console.error('pool/join error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
