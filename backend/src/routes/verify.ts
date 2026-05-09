import { Router, Request, Response } from 'express';
import multer from 'multer';
import { verifyEvidence } from '../ai/verifyAgent';
import { x402Middleware } from '../x402/middleware';
import { createClient } from '@supabase/supabase-js';
import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { readFileSync } from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type ProgramIdl = anchor.Idl & {
  address?: string;
};

let cachedIdl: ProgramIdl | null = null;

function getProgramIdl(): ProgramIdl {
  if (cachedIdl) return cachedIdl;

  const idlPath = path.resolve(__dirname, '../../../frontend/src/lib/stru_idl.json');
  cachedIdl = JSON.parse(readFileSync(idlPath, 'utf8')) as ProgramIdl;
  return cachedIdl;
}

async function callMarkComplete(poolPdaStr: string, walletAddress: string) {
  if (!process.env.ORACLE_WALLET_PRIVATE_KEY || !process.env.PROGRAM_ID) return;
  try {
    const connection = new Connection(process.env.ANCHOR_PROVIDER_URL!, 'confirmed');
    const oracleKeypair = Keypair.fromSecretKey(bs58.decode(process.env.ORACLE_WALLET_PRIVATE_KEY));
    const wallet = new anchor.Wallet(oracleKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const idl = getProgramIdl();
    const programId = process.env.PROGRAM_ID || idl.address;

    if (!programId) {
      throw new Error('PROGRAM_ID is required or must be present in the IDL');
    }

    const program = new anchor.Program(idl, programId, provider);

    const poolPda = new PublicKey(poolPdaStr);
    const walletKey = new PublicKey(walletAddress);
    const [participantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), poolPda.toBuffer(), walletKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .markComplete()
      .accounts({ pool: poolPda, participant: participantPda, oracle: oracleKeypair.publicKey })
      .signers([oracleKeypair])
      .rpc();

    console.log(`mark_complete called for ${walletAddress} in pool ${poolPdaStr}`);
  } catch (err) {
    console.error('mark_complete error (non-fatal):', err);
  }
}

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

    // On pass: update participant status and call mark_complete on-chain
    if (verdict.verdict === 'pass') {
      await supabase
        .from('participants')
        .update({ status: 'completed' })
        .eq('pool_id', pool_id)
        .eq('wallet_address', wallet_address);

      // Fetch the pool PDA from Supabase then call mark_complete via oracle
      const { data: poolRow } = await supabase
        .from('pools')
        .select('program_pda')
        .eq('id', pool_id)
        .single();

      if (poolRow?.program_pda && poolRow.program_pda !== 'pending') {
        void callMarkComplete(poolRow.program_pda, wallet_address);
      }
    }

    return res.json(verdict);
  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
