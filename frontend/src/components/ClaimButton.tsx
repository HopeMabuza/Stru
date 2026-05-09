import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type ParticipantRow, type PoolRow } from "@/lib/api";
import { onChainSettlePool, onChainClaim } from "@/lib/solana";

interface Props {
  pool: PoolRow;
  participants: ParticipantRow[];
  wallet: string;
  onChanged?: () => void;
}

export function ClaimButton({ pool, participants, wallet, onChanged }: Props) {
  const [settling, setSettling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = new Date(pool.deadline).getTime() <= Date.now();
  if (!expired) return null;

  const me = participants.find((p) => p.wallet_address === wallet);
  const winners = participants.filter((p) => p.status === "completed");
  const isWinner = me?.status === "completed";
  const settled = pool.status === "settled";

  async function settle() {
    if (!wallet) return;
    setSettling(true);
    setError(null);
    try {
      await onChainSettlePool({ walletAddress: wallet, poolPda: pool.program_pda });
      await api.settlePool(pool.id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settle failed");
    } finally {
      setSettling(false);
    }
  }

  async function claim() {
    if (!wallet) return;
    setClaiming(true);
    setError(null);
    try {
      await onChainClaim({ walletAddress: wallet, poolPda: pool.program_pda });
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  if (winners.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-secondary p-5 text-sm">
        Pool ended with no completed participants. Stakes will be refunded once settled on-chain.
        {!settled && wallet && (
          <div className="mt-3">
            <Button variant="ink" disabled={settling || !wallet} onClick={settle}>
              {settling ? "Settling..." : "Settle & refund"}
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!settled) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-cream p-5">
        <div className="mb-2 font-display text-lg font-extrabold">Pool ended</div>
        <p className="text-sm text-foreground/70">
          Anyone can settle the pool to distribute the pot. {winners.length} participant
          {winners.length === 1 ? "" : "s"} completed.
        </p>
        <div className="mt-3">
          <Button variant="ink" disabled={settling || !wallet} onClick={settle}>
            {settling ? "Settling..." : "Settle pool"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!isWinner) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-secondary p-5 text-sm">
        Pool settled. You didn&apos;t complete the goal — your stake was distributed to the winners.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-lime/30 p-5">
      <div className="mb-2 font-display text-lg font-extrabold">You won 🏆</div>
      <p className="text-sm text-foreground/80">Your share of the pot is ready to claim.</p>
      <div className="mt-3">
        <Button variant="hero" disabled={claiming} onClick={claim}>
          {claiming ? "Claiming..." : "Claim winnings"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
