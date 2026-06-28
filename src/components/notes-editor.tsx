"use client";
import { useState, useTransition } from "react";
import { updateNotes } from "@/lib/actions";

export function NotesEditor({ nodeType, id, initial }: { nodeType: "initiative" | "action"; id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={6} placeholder="Notes (markdown)…"
        className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={() => start(async () => { await updateNotes(nodeType, id, value); setSaved(true); })}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {pending ? "Saving…" : "Save notes"}
        </button>
        {saved && <span className="text-sm text-health-green">Saved</span>}
      </div>
    </div>
  );
}
