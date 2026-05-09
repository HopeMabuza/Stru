import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /users — upsert by wallet_address; returns the user row.
// privy_id is required + unique in schema; until Privy is wired in we synth one
// from the wallet address. Replace with the real Privy ID once auth is hooked up.
router.post('/', async (req: Request, res: Response) => {
  try {
    const { wallet_address, privy_id } = req.body as {
      wallet_address: string;
      privy_id?: string;
    };

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    const resolvedPrivyId = privy_id || `stub_${wallet_address}`;

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address)
      .maybeSingle();

    if (existing) return res.json(existing);

    const { data, error } = await supabase
      .from('users')
      .insert({ wallet_address, privy_id: resolvedPrivyId })
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
