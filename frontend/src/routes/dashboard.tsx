import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type PoolRow } from "@/lib/api";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const wallet = useWallet();
  const [pools, setPools] = useState<PoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    api
      .listPools(wallet)
      .then(setPools)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [wallet]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-ink bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <Link to="/create">
            <Button variant="hero" size="default">
              <Plus /> New pool
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Your pools</h1>
        <p className="mt-2 font-mono text-xs text-foreground/60">
          wallet · {wallet || "loading..."}
        </p>

        {error && (
          <div className="mt-6 rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </div>
        )}

        {pools === null && !error && (
          <p className="mt-6 text-sm text-foreground/60">Loading...</p>
        )}

        {pools && pools.length === 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-8 text-center">
            <p className="text-foreground/70">No pools yet.</p>
            <div className="mt-4">
              <Link to="/create">
                <Button variant="hero">Start your first stake</Button>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(pools ?? []).map((p) => (
            <Link
              key={p.id}
              to="/pool/$id"
              params={{ id: p.id }}
              className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal-sm transition-all hover:-translate-y-1 hover:shadow-brutal"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                {p.status}
              </div>
              <div className="mt-1 font-display text-xl font-extrabold">{p.goal_text}</div>
              <div className="mt-2 flex justify-between text-sm text-foreground/70">
                <span>{p.stake_amount} USDC stake</span>
                <span>ends {new Date(p.deadline).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
