// Typed client for the Stru backend (backend/src/index.ts).
// Reads VITE_BACKEND_URL from env; falls back to http://localhost:4000.

const DEFAULT_BACKEND_URL = "http://localhost:4000";

const BASE = normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL as string | undefined);

function normalizeBackendUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return DEFAULT_BACKEND_URL;

  const withProtocol = /^https?:\/\//i.test(raw)
    ? raw
    : raw.startsWith("//")
      ? `https:${raw}`
      : /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(raw)
        ? `http://${raw}`
        : `https://${raw}`;

  return withProtocol.replace(/\/+$/, "");
}

export interface Goal {
  description: string;
  proof_type: string;
  threshold: number;
  unit: string;
  verifiable: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface GoalChatResult {
  reply: string;
  goalReady: boolean;
  goal: Goal | null;
  alternatives: string[] | null;
}

export interface PoolRow {
  id: string;
  program_pda: string;
  goal_text: string;
  goal_json: Goal;
  stake_amount: number;
  budget: number;
  deadline: string;
  status: "active" | "settled" | "cancelled";
  creator_id: string | null;
  created_at: string;
}

export interface ParticipantRow {
  id: string;
  pool_id: string;
  wallet_address: string;
  status: "pending" | "completed" | "failed";
  joined_at: string;
}

export interface VerifyResult {
  verdict: "pass" | "fail";
  reason: string;
  what_would_count: string;
  confidence?: number;
}

export interface UserRow {
  id: string;
  wallet_address: string;
  privy_id: string;
  created_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    throw new Error(await responseMessage(res));
  }
  return jsonResponse<T>(res);
}

async function jsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await res.text().catch(() => "");
    const preview = text.length > 180 ? `${text.slice(0, 180)}...` : text;
    throw new Error(
      `Expected JSON from backend at ${res.url}, got ${contentType || "unknown content type"}: ${preview}`,
    );
  }
  return res.json() as Promise<T>;
}

async function responseMessage(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`;
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return text.length > 180 ? `${text.slice(0, 180)}...` : text;
  }
}

export const api = {
  upsertUser(wallet_address: string, privy_id?: string): Promise<UserRow> {
    return request<UserRow>("/users", {
      method: "POST",
      body: JSON.stringify({ wallet_address, privy_id }),
    });
  },

  goalChat(message: string, history: ChatMessage[]): Promise<GoalChatResult> {
    return request<GoalChatResult>("/goal/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  },

  goalCreate(input: {
    goal: Goal;
    stake_amount: number;
    duration_secs: number;
    creator_wallet: string;
  }): Promise<{ pool_id: string; pool_pda: string; invite_link: string; goal_hash: number[]; pool_id_u64: number }> {
    return request("/goal/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getPool(id: string): Promise<{ pool: PoolRow; participants: ParticipantRow[] }> {
    return request(`/pool/${id}`);
  },

  listPools(wallet?: string): Promise<PoolRow[]> {
    const qs = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
    return request<PoolRow[]>(`/pool${qs}`);
  },

  joinPool(id: string, wallet_address: string): Promise<ParticipantRow> {
    return request<ParticipantRow>(`/pool/${id}/join`, {
      method: "POST",
      body: JSON.stringify({ wallet_address }),
    });
  },

  settlePool(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/pool/${id}/settle`, { method: "POST" });
  },

  // Multipart upload — do not set content-type header, browser sets boundary.
  async verifyEvidence(input: {
    file: File;
    pool_id: string;
    wallet_address: string;
  }): Promise<VerifyResult> {
    const fd = new FormData();
    fd.append("file", input.file);
    fd.append("pool_id", input.pool_id);
    fd.append("wallet_address", input.wallet_address);
    const res = await fetch(`${BASE}/verify`, { method: "POST", body: fd });
    if (!res.ok) {
      throw new Error(await responseMessage(res));
    }
    return jsonResponse<VerifyResult>(res);
  },
};
