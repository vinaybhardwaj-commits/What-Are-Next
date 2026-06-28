"use client";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { reviewPrep } from "@/lib/ai/capabilities";

export function ReviewCopilot() {
  const [data, setData] = useState<{ text: string; doneCount: number; staleCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  function run() { setBusy(true); reviewPrep().then(setData).finally(() => setBusy(false)); }
  return (
    <div>
      <button onClick={run} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {data ? "Refresh review" : "Prepare my weekly review"}
      </button>
      {data && (
        <>
          <div className="mt-4 flex gap-3">
            <div className="rounded-lg border bg-card px-4 py-2 text-center"><div className="text-xl font-semibold text-health-green">{data.doneCount}</div><div className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">done this week</div></div>
            <div className="rounded-lg border bg-card px-4 py-2 text-center"><div className="text-xl font-semibold text-health-amber">{data.staleCount}</div><div className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">stale waiting-ons</div></div>
          </div>
          <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-card p-4 text-sm leading-relaxed">{data.text}</div>
        </>
      )}
    </div>
  );
}
