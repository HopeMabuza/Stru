import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are an evidence verifier for StakeUp. You receive:
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
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const goalText = `Goal: ${goal.description}\nProof type required: ${goal.proof_type}\nThreshold: ${goal.threshold} ${goal.unit}`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: fileBuffer.toString('base64'),
      },
    },
    goalText,
  ]);

  const text = result.response.text().trim();

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
