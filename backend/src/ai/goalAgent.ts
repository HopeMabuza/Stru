import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a goal-setting coach for StakeUp, an accountability app.
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
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    })),
  });

  const result = await chat.sendMessage(message);
  const reply = result.response.text();

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
