"use client";
import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { critiqueKernel } from "@/lib/ai/capabilities";

export function KernelCritique({ goalId }: { goalId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function run() { setBusy(true); critiqueKernel(goalId).then((t) => setText(t)).finally(() => setBusy(false)); }
  return (
    <div>
      <button onClick={run} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {text ? "Re-critique" : "Critique kernel (AI)"}
      </button>
      {text && <div className="mt-3 whitespace-pre-wrap rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm leading-relaxed">{text}</div>}
    </div>
  );
}
