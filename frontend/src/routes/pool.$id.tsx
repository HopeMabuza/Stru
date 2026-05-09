import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { PoolDashboard } from "@/components/PoolDashboard";
import { ProofSubmit } from "@/components/ProofSubmit";
import { ClaimButton } from "@/components/ClaimButton";
import { api, type ParticipantRow, type PoolRow } from "@/lib/api";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/pool/$id")({
  head: () => ({
    meta: [
      { title: "Pool — Stru" },
      {
        name: "description",
        content: "Join a Stru pool, submit AI-verifiable proof, and track payout status.",
      },
    ],
  }),
  component: PoolPage,
});

function shortWallet(wallet: string) {
  return wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "connecting";
}

function PoolPage() {
  const { id } = Route.useParams();
  const wallet = useWallet();
  const [pool, setPool] = useState<PoolRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getPool(id);
      setPool(res.pool);
      setParticipants(res.participants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pool");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/pool/${id}` : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-ink bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <WalletButton variant="cream" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 space-y-6">
        {error && (
          <div className="rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </div>
        )}

        {!pool && !error && (
          <div
            className="h-64 animate-pulse rounded-3xl border-2 border-ink/20 bg-cream"
            aria-label="Loading pool"
          />
        )}

        {pool && (
          <>
            <p className="font-mono text-xs text-foreground/60">wallet · {shortWallet(wallet)}</p>
            <PoolDashboard
              pool={pool}
              participants={participants}
              wallet={wallet}
              onChanged={load}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border-2 border-ink bg-cream p-5 shadow-brutal-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                  Invite link
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    className="flex-1 rounded-md border-2 border-ink bg-cream px-3 py-2 font-mono text-xs"
                  />
                  <Button
                    variant="ink"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(inviteUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    <Copy className="size-4" /> {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {participants.some((p) => p.wallet_address === wallet) &&
                pool.status === "active" && (
                  <ProofSubmit
                    poolId={pool.id}
                    wallet={wallet}
                    onVerdict={(v) => {
                      if (v.verdict === "pass") load();
                    }}
                  />
                )}
            </div>

            <ClaimButton pool={pool} participants={participants} wallet={wallet} onChanged={load} />
          </>
        )}
      </main>
    </div>
  );
}
