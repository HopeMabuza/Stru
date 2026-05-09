import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type ChatMessage, type Goal } from "@/lib/api";

interface Props {
  onGoalReady: (goal: Goal) => void;
}

export function GoalChat({ onGoalReady }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [alternatives, setAlternatives] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(message: string) {
    if (!message.trim() || pending) return;
    setError(null);
    setPending(true);
    const newHistory: ChatMessage[] = [...history, { role: "user", content: message }];
    setHistory(newHistory);
    setInput("");

    try {
      const res = await api.goalChat(message, history);
      setHistory([...newHistory, { role: "model", content: res.reply }]);
      if (res.goalReady && res.goal) setGoal(res.goal);
      if (res.alternatives) setAlternatives(res.alternatives);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setPending(false);
    }
  }

  function visibleReply(content: string) {
    return content.replace(/GOAL_READY:[\s\S]*/g, "").replace(/ALTERNATIVES:[\s\S]*/g, "").trim();
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal">
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="font-mono text-foreground/60">goal-chat://session</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="ticker-pulse h-2 w-2 rounded-full bg-lime" />
          <span className="text-foreground/60">{pending ? "thinking..." : "ready"}</span>
        </span>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {history.length === 0 && (
          <p className="text-sm text-foreground/60">
            Start by telling the coach what you want to commit to. They'll grill you until the goal
            is measurable.
          </p>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border-2 border-ink bg-secondary px-4 py-2.5 text-sm"
                : "max-w-[88%] rounded-2xl rounded-tl-sm border-2 border-ink bg-cream px-4 py-2.5 text-sm"
            }
          >
            {m.role === "model" ? visibleReply(m.content) || "..." : m.content}
          </div>
        ))}
      </div>

      {alternatives && (
        <div className="mt-4 rounded-xl border-2 border-ink bg-coral/10 p-3 text-sm">
          <div className="mb-2 font-bold text-coral">Try one of these instead:</div>
          <ul className="space-y-1">
            {alternatives.map((a, i) => (
              <li key={i}>
                <button
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => send(a)}
                >
                  {i + 1}. {a}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {goal && (
        <div className="mt-4 rounded-xl border-2 border-ink bg-lime/30 p-4 text-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-ink">
            Locked-in goal
          </div>
          <div className="mt-1 font-display text-lg font-extrabold">{goal.description}</div>
          <ul className="mt-2 space-y-0.5 text-foreground/80">
            <li>
              <span className="font-mono text-xs">proof:</span> {goal.proof_type}
            </li>
            <li>
              <span className="font-mono text-xs">threshold:</span> {goal.threshold} {goal.unit}
            </li>
          </ul>
          <div className="mt-3">
            <Button variant="hero" onClick={() => onGoalReady(goal)}>
              Use this goal
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </div>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="flex-1 rounded-md border-2 border-ink bg-cream px-3 py-2 text-sm focus:outline-none"
          placeholder="I want to..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" variant="ink" disabled={pending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
