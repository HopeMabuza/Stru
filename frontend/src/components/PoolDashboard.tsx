import { useEffect, useState } from "react";
import { Clock, Coins, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type ParticipantRow, type PoolRow } from "@/lib/api";

interface Props {
  pool: PoolRow;
  participants: ParticipantRow[];
  wallet: string;
  onChanged?: () => void;
}

function useCountdown(deadlineIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(deadlineIso).getTime() - now);
  const totalS = Math.floor(ms / 1000);
  const d = Math.floor(totalS / 86400);
  const h = Math.floor((totalS % 86400) / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  return { ms, d, h, m, s, expired: ms === 0 };
}

export function PoolDashboard({ pool, participants, wallet, onChanged }: Props) {
  const { d, h, m, s, expired } = useCountdown(pool.deadline);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joined = participants.some((p) => p.wallet_address === wallet);
  const completed = participants.filter((p) => p.status === "completed").length;
  const pot = pool.stake_amount * participants.length;

  async function join() {
    if (!wallet) return;
    setJoining(true);
    setError(null);
    try {
      await api.joinPool(pool.id, wallet);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Join failed");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-brutal-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60">
            Pool · {pool.id.slice(0, 8)}
          </div>
          <div className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
            {pool.goal_text}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border-2 border-ink bg-lime px-3 py-1.5 text-sm font-bold">
          <Clock className="size-4" />
          {expired ? "ended" : `${d}d ${h}h ${m}m ${s}s left`}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Pot" value={`${pot} USDC`} icon={Coins} />
        <Stat label="Stake" value={`${pool.stake_amount}`} icon={Coins} />
        <Stat label="Players" value={`${participants.length}`} icon={Users} />
        <Stat label="On track" value={`${completed} / ${participants.length}`} icon={Trophy} />
      </div>

      <div className="mt-6 space-y-2.5">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="w-32 truncate font-mono text-xs">{p.wallet_address}</div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md border-2 border-ink bg-cream">
              <div
                className={`h-full border-r-2 border-ink ${
                  p.status === "completed" ? "bg-lime" : "bg-secondary"
                }`}
                style={{ width: p.status === "completed" ? "100%" : "10%" }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[11px] font-bold">
                {p.status}
              </span>
            </div>
          </div>
        ))}
        {participants.length === 0 && (
          <p className="text-sm text-foreground/60">No one has joined yet.</p>
        )}
      </div>

      {!joined && !expired && pool.status === "active" && (
        <div className="mt-6">
          <Button variant="hero" disabled={joining || !wallet} onClick={join}>
            {joining ? "Joining..." : `Join & stake ${pool.stake_amount} USDC`}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border-2 border-ink bg-secondary p-3">
      <Icon className="size-4 opacity-60" />
      <div className="mt-2 font-display text-xl font-extrabold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-foreground/60">{label}</div>
    </div>
  );
}
