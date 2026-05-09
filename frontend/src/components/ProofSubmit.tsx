import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type VerifyResult } from "@/lib/api";

interface Props {
  poolId: string;
  wallet: string;
  onVerdict?: (v: VerifyResult) => void;
}

export function ProofSubmit({ poolId, wallet, onVerdict }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file || !wallet) return;
    setSubmitting(true);
    setError(null);
    setVerdict(null);
    try {
      const v = await api.verifyEvidence({ file, pool_id: poolId, wallet_address: wallet });
      setVerdict(v);
      onVerdict?.(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal">
      <div className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground/60">
        Submit proof
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-cream file:px-3 file:py-1.5 file:text-sm file:font-bold"
      />

      <div className="mt-4">
        <Button
          variant="hero"
          disabled={!file || submitting || !wallet}
          onClick={submit}
        >
          {submitting ? "Verifying..." : "Send to AI referee"}
        </Button>
      </div>

      {verdict && (
        <div
          className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
            verdict.verdict === "pass"
              ? "border-lime bg-lime/15"
              : "border-coral bg-coral/10"
          }`}
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <Bot className="size-3" />
            referee verdict
          </div>
          <div className="font-bold">
            {verdict.verdict === "pass" ? "Counts. ✓" : "Doesn't count."}
          </div>
          <p className="mt-1 text-foreground/80">{verdict.reason}</p>
          {verdict.what_would_count && (
            <p className="mt-2 text-xs text-foreground/60">
              <span className="font-bold">What would count:</span> {verdict.what_would_count}
            </p>
          )}
          {typeof verdict.confidence === "number" && (
            <div className="mt-2 font-mono text-[11px] text-foreground/50">
              conf {verdict.confidence.toFixed(2)}
            </div>
          )}
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
