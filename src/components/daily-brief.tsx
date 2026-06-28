"use client";
import { useState, useTransition } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { getDailyBrief } from "@/lib/ai/capabilities";

export function DailyBrief() {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  function run(force = false) { setBusy(true); getDailyBrief(force).then((r) => setText(r.text)).finally(() => setBusy(false)); }
  if (dismissed) return null;
  return (
    <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider font-mono text-accent-foreground"><Sparkles className="h-3.5 w-3.5" /> Daily brief</div>
        {text && <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {text ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
      ) : (
        <button onClick={() => run(false)} disabled={busy} className="inline-flex items-center gap-1 text-sm text-accent-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Thinking…" : "Generate today's focus"}
        </button>
      )}
    </div>
  );
}
