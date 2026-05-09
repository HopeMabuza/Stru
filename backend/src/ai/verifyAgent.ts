import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const VERIFY_MODEL = process.env.GEMINI_VERIFY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const AI_DEMO_FALLBACK = process.env.AI_DEMO_FALLBACK !== 'false';

const SYSTEM_PROMPT = `You are an evidence verifier for Stru. You receive:
- An image or file submitted as proof
- The goal object the user committed to

Decide if the evidence satisfies the goal's proof_type and threshold.
Be strict but fair. Explain your reasoning in plain English.

Always return JSON (no markdown, no code fences):
{
  "verdict": "pass" or "fail",
  "reason": "...",
  "what_would_count": "...",
  "confidence": <number 0-1>
}

Common rejection reasons to check:
- Image does not match the required proof type
- Timestamp/metrics are missing or unclear
- Image appears to be from the internet
- Evidence is for a different activity than committed`;

export interface VerifyResult {
  verdict: 'pass' | 'fail';
  reason: string;
  what_would_count: string;
  confidence?: number;
}

export async function verifyEvidence(
  fileBuffer: Buffer,
  mimeType: string,
  goal: Record<string, unknown>
): Promise<VerifyResult> {
  const model = genAI.getGenerativeModel({
    model: VERIFY_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const goalText = `Goal: ${goal.description}\nProof type required: ${goal.proof_type}\nThreshold: ${goal.threshold} ${goal.unit}`;

  let text: string;
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: fileBuffer.toString('base64'),
        },
      },
      goalText,
    ]);
    text = result.response.text().trim();
  } catch (err) {
    if (AI_DEMO_FALLBACK && shouldUseDemoFallback(err)) {
      console.warn('Gemini verify agent unavailable; using demo fallback:', describeAiError(err));
      return {
        verdict: 'pass',
        reason:
          'Demo fallback accepted this proof because Gemini quota/model access is unavailable. For production, enable Gemini billing/quota or set AI_DEMO_FALLBACK=false.',
        what_would_count: `A clear ${String(goal.proof_type || 'proof file')} showing ${String(goal.description || 'the committed activity')}.`,
        confidence: 0.5,
      };
    }
    throw err;
  }

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);
    return {
      verdict: parsed.verdict === 'pass' ? 'pass' : 'fail',
      reason: parsed.reason || 'No reason provided',
      what_would_count: parsed.what_would_count || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    };
  } catch {
    // If JSON parse fails, default to fail with raw response as reason
    return {
      verdict: 'fail',
      reason: text,
      what_would_count: 'Please submit a clear image matching the proof type for this goal.',
    };
  }
}

function shouldUseDemoFallback(err: unknown): boolean {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: unknown }).status) : 0;
  return status === 401 || status === 403 || status === 404 || status === 429;
}

function describeAiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
