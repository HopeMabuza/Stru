import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalChat } from "@/components/GoalChat";
import { api, type Goal } from "@/lib/api";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/create")({
  component: CreatePage,
});

function CreatePage() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [stake, setStake] = useState(10);
  const [durationMins, setDurationMins] = useState(60);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!goal || !wallet) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.goalCreate({
        goal,
        stake_amount: stake,
        duration_secs: durationMins * 60,
        creator_wallet: wallet,
      });
      navigate({ to: "/pool/$id", params: { id: res.pool_id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create pool");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-ink bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <span className="font-mono text-xs text-foreground/60">
            wallet · {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "loading"}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-10 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            Set a goal worth betting on
          </h1>
          <p className="mt-2 text-foreground/70">
            Talk to the coach until the goal is concrete and verifiable. Then lock in the stake and
            timer.
          </p>
          <div className="mt-6">
            <GoalChat onGoalReady={setGoal} />
          </div>
        </section>

        <aside className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal h-fit">
          <div className="text-xs font-bold uppercase tracking-widest text-foreground/60">
            Pool config
          </div>

          <label className="mt-4 block text-sm font-medium">Stake per person (USDC)</label>
          <input
            type="number"
            min={1}
            value={stake}
            onChange={(e) => setStake(parseFloat(e.target.value || "0"))}
            className="mt-1 w-full rounded-md border-2 border-ink bg-cream px-3 py-2 text-sm"
          />

          <label className="mt-4 block text-sm font-medium">Duration (minutes)</label>
          <input
            type="number"
            min={5}
            value={durationMins}
            onChange={(e) => setDurationMins(parseInt(e.target.value || "0", 10))}
            className="mt-1 w-full rounded-md border-2 border-ink bg-cream px-3 py-2 text-sm"
          />

          <div className="mt-5 rounded-xl border-2 border-ink bg-secondary p-3 text-sm">
            <div className="font-bold">Goal</div>
            <div className="mt-1 text-foreground/70">
              {goal ? goal.description : "Not set yet — finish the chat first."}
            </div>
          </div>

          <div className="mt-5">
            <Button
              variant="hero"
              size="lg"
              disabled={!goal || creating || !wallet}
              onClick={create}
              className="w-full"
            >
              {creating ? "Creating..." : "Create pool"}
            </Button>
          </div>

          {error && (
            <div className="mt-3 rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
              {error}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
