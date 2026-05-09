import { Button } from "@/components/ui/button";
import type { ParticipantRow, PoolRow } from "@/lib/api";

interface Props {
  pool: PoolRow;
  participants: ParticipantRow[];
  wallet: string;
}

// Settlement and claim are on-chain (Anchor settle_pool + claim).
// This component reflects state once the deadline passes; the actual signing
// will be wired to the Anchor program in a follow-up.
export function ClaimButton({ pool, participants, wallet }: Props) {
  const expired = new Date(pool.deadline).getTime() <= Date.now();
  if (!expired) return null;

  const me = participants.find((p) => p.wallet_address === wallet);
  const winners = participants.filter((p) => p.status === "completed");
  const isWinner = me?.status === "completed";
  const settled = pool.status === "settled";

  if (winners.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-secondary p-5 text-sm">
        Pool ended with no completed participants. Stakes will be refunded once settled on-chain.
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
          <Button variant="ink" disabled title="Anchor settle_pool not yet wired in">
            Settle pool (on-chain — coming soon)
          </Button>
        </div>
      </div>
    );
  }

  if (!isWinner) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-secondary p-5 text-sm">
        Pool settled. You didn't complete the goal — your stake was distributed to the winners.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-lime/30 p-5">
      <div className="mb-2 font-display text-lg font-extrabold">You won 🏆</div>
      <p className="text-sm text-foreground/80">
        Your share of the pot is ready to claim.
      </p>
      <div className="mt-3">
        <Button variant="hero" disabled title="Anchor claim not yet wired in">
          Claim winnings (on-chain — coming soon)
        </Button>
      </div>
    </div>
  );
}
