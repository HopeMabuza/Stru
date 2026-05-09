import { Router, Request, Response } from 'express';
import multer from 'multer';
import { verifyEvidence } from '../ai/verifyAgent';
import { x402Middleware } from '../x402/middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const EVIDENCE_BUCKET = process.env.SUPABASE_EVIDENCE_BUCKET || 'evidence';

function isBucketNotFound(error: unknown): boolean {
  const fields = error as { message?: string; statusCode?: string; status?: number };
  return (
    fields?.statusCode === '404' ||
    fields?.status === 404 ||
    /bucket not found/i.test(fields?.message || String(error))
  );
}

async function uploadEvidenceFile(fileName: string, file: Express.Multer.File) {
  const upload = () =>
    supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

  let { data, error } = await upload();
  if (error && isBucketNotFound(error)) {
    console.warn(`Supabase storage bucket "${EVIDENCE_BUCKET}" not found; creating it now.`);
    const { error: createError } = await supabase.storage.createBucket(EVIDENCE_BUCKET, {
      public: true,
    });

    if (createError && !/already exists/i.test(createError.message)) {
      throw createError;
    }

    ({ data, error } = await upload());
  }

  if (error) throw error;
  return data;
}

// POST /verify — multipart: file, pool_id, wallet_address
router.post('/', x402Middleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { pool_id, wallet_address } = req.body as {
      pool_id: string;
      wallet_address: string;
    };

    if (!req.file || !pool_id || !wallet_address) {
      return res.status(400).json({ error: 'file, pool_id, and wallet_address are required' });
    }

    // Fetch the goal from Supabase
    const { data: pool, error: poolError } = await supabase
      .from('pools')
      .select('goal_json, goal_text')
      .eq('id', pool_id)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Upload evidence file to Supabase Storage
    const fileName = `${pool_id}/${wallet_address}/${Date.now()}_${req.file.originalname}`;
    await uploadEvidenceFile(fileName, req.file);

    const { data: { publicUrl } } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(fileName);

    // Run AI verification
    const verdict = await verifyEvidence(req.file.buffer, req.file.mimetype, pool.goal_json);

    // Insert evidence record
    await supabase.from('evidence').insert({
      pool_id,
      wallet_address,
      file_url: publicUrl,
      ai_verdict: verdict.verdict,
      ai_reason: verdict.reason,
      what_would_count: verdict.what_would_count,
      confidence: verdict.confidence ?? null,
    });

    // On pass: update participant status and call mark_complete
    if (verdict.verdict === 'pass') {
      await supabase
        .from('participants')
        .update({ status: 'completed' })
        .eq('pool_id', pool_id)
        .eq('wallet_address', wallet_address);

      // TODO: call Anchor mark_complete instruction via oracle keypair
      // This requires the program to be deployed and PROGRAM_ID set in .env
    }

    return res.json(verdict);
  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
