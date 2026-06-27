"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { draftNudge } from "@/lib/ai/capabilities";

export function NudgeDraft({ taskId }: { taskId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  function run() { setBusy(true); draftNudge(taskId).then((t) => setText(t)).finally(() => setBusy(false)); }
  function copy() { if (text) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } }
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Nudge</div>
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-1 text-sm text-accent-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {text ? "Redraft" : "Draft follow-up"}
        </button>
      </div>
      {text && (
        <div className="mt-2">
          <div className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm">{text}</div>
          <button onClick={copy} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-3.5 w-3.5 text-health-green" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
