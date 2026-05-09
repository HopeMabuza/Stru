import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { api, type PoolRow } from "@/lib/api";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Stru" },
      {
        name: "description",
        content: "View active Stru goal pools and create a new accountability stake.",
      },
    ],
  }),
  component: DashboardPage,
});

function shortWallet(wallet: string) {
  return wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "connecting";
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DashboardPage() {
  const wallet = useWallet();
  const [pools, setPools] = useState<PoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      setPools(null);
      return;
    }
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
          <div className="flex items-center gap-2">
            <WalletButton variant="cream" />
            <Link to="/create">
              <Button variant="hero" size="default">
                <Plus /> New pool
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Your pools</h1>
        <p className="mt-2 font-mono text-xs text-foreground/60">wallet · {shortWallet(wallet)}</p>

        {error && (
          <div className="mt-6 rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </div>
        )}

        {!wallet && !error && (
          <div className="mt-8 rounded-2xl border-2 border-ink bg-cream p-8 text-center shadow-brutal-sm">
            <p className="font-display text-2xl font-extrabold">
              Connect Phantom to see your pools.
            </p>
            <p className="mt-1 text-sm text-foreground/65">
              Your dashboard is keyed by your Solana wallet address.
            </p>
            <div className="mt-4">
              <WalletButton />
            </div>
          </div>
        )}

        {wallet && pools === null && !error && (
          <div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Loading pools">
            {[0, 1].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded-2xl border-2 border-ink/20 bg-cream"
              />
            ))}
          </div>
        )}

        {wallet && pools && pools.length === 0 && (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-8 text-center">
            <p className="font-display text-2xl font-extrabold">No pools yet.</p>
            <p className="mt-1 text-sm text-foreground/65">
              Create a goal, set a stake, and invite your group.
            </p>
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
                {p.status === "active" ? "active pool" : p.status}
              </div>
              <div className="mt-1 font-display text-xl font-extrabold">{p.goal_text}</div>
              <div className="mt-2 flex justify-between text-sm text-foreground/70">
                <span>{p.stake_amount} USDC stake</span>
                <span>ends {formatDeadline(p.deadline)}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
