import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GOAL_MODEL = process.env.GEMINI_GOAL_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const AI_DEMO_FALLBACK = process.env.AI_DEMO_FALLBACK !== 'false';

const SYSTEM_PROMPT = `You are a goal-setting coach for Stru, an accountability app.
Your job is to turn vague goals into measurable, verifiable commitments.

A goal is MEASURABLE when it has ALL of:
1. A concrete action (not a feeling or state)
2. A quantity (number, frequency, duration)
3. A proof type (what evidence will you accept?)
4. Verifiability (can an AI look at a photo/screenshot and confirm it?)

Ask clarifying questions one at a time. Be friendly but direct.

When you have enough information, output a JSON object:
{
  "description": "...",
  "proof_type": "...",
  "threshold": <number>,
  "unit": "...",
  "verifiable": true
}
Prefix it with: GOAL_READY:

If after 3 exchanges you cannot make the goal measurable, output:
ALTERNATIVES:
1. [reframed option]
2. [reframed option]
3. [reframed option]

Never confirm a goal that relies on self-reporting alone.`;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GoalChatResult {
  reply: string;
  goalReady: boolean;
  goal: null | {
    description: string;
    proof_type: string;
    threshold: number;
    unit: string;
    verifiable: boolean;
  };
  alternatives: null | string[];
}

export async function chatWithGoalAgent(
  message: string,
  history: ChatMessage[]
): Promise<GoalChatResult> {
  const model = genAI.getGenerativeModel({
    model: GOAL_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    })),
  });

  let reply: string;
  try {
    const result = await chat.sendMessage(message);
    reply = result.response.text();
  } catch (err) {
    if (AI_DEMO_FALLBACK && shouldUseDemoFallback(err)) {
      console.warn('Gemini goal agent unavailable; using demo fallback:', describeAiError(err));
      return demoGoalChat(message, history);
    }
    throw err;
  }

  // Check if goal is ready
  if (reply.includes('GOAL_READY:')) {
    const jsonMatch = reply.match(/GOAL_READY:\s*(\{[\s\S]*?\})/);
    if (jsonMatch) {
      try {
        const goal = JSON.parse(jsonMatch[1]);
        return { reply, goalReady: true, goal, alternatives: null };
      } catch {
        // JSON parse failed, treat as regular message
      }
    }
  }

  // Check for alternatives
  if (reply.includes('ALTERNATIVES:')) {
    const lines = reply.split('\n').filter((l) => /^\d+\./.test(l.trim()));
    const alternatives = lines.map((l) => l.replace(/^\d+\.\s*/, '').trim());
    return { reply, goalReady: false, goal: null, alternatives };
  }

  return { reply, goalReady: false, goal: null, alternatives: null };
}

function shouldUseDemoFallback(err: unknown): boolean {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: unknown }).status) : 0;
  return status === 401 || status === 403 || status === 404 || status === 429;
}

function describeAiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function demoGoalChat(message: string, history: ChatMessage[]): GoalChatResult {
  const transcript = [...history.map((h) => h.content), message].join(' ').toLowerCase();
  const quantity = transcript.match(/\b\d+\b/)?.[0];
  const hasProof = /(photo|selfie|screenshot|image|export|receipt|strava|video|file|proof)/i.test(transcript);

  if (quantity && hasProof) {
    const threshold = Number(quantity);
    const unit = /(km|kilometer|kilometre)/i.test(transcript)
      ? 'km'
      : /(page|book)/i.test(transcript)
        ? 'pages'
        : 'sessions';
    const proofType = /(screenshot|export|strava)/i.test(transcript)
      ? 'screenshot or export showing the completed activity and timestamp'
      : 'clear photo/selfie showing the activity context and timestamp';
    const goal = {
      description: `Complete ${threshold} ${unit}`,
      proof_type: proofType,
      threshold,
      unit,
      verifiable: true,
    };
    return {
      reply: `GOAL_READY: ${JSON.stringify(goal)}\nDemo fallback locked this into a measurable goal.`,
      goalReady: true,
      goal,
      alternatives: null,
    };
  }

  return {
    reply:
      'Gemini quota is unavailable, so demo fallback is active. Give me one number and a proof type, e.g. “12 gym sessions, gym selfie each time.”',
    goalReady: false,
    goal: null,
    alternatives: null,
  };
}
