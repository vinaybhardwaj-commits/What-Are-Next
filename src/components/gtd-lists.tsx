"use client";
import { useState } from "react";
import { TaskRow, type RowTask } from "@/components/task-row";

type T = RowTask & { buckets: string[] };
type P = { id: string; name: string; color: string };
const VIEWS = [
  { key: "next", label: "Next Actions" },
  { key: "waiting", label: "Waiting On" },
  { key: "scheduled", label: "Scheduled / Tickler" },
  { key: "someday", label: "Someday / Maybe" },
  { key: "blocked", label: "Blocked" },
] as const;
const CONTEXTS = ["@home", "@clinic", "@deep-work", "@calls", "@claude-code", "@errand", "@review"];

export function GtdLists({ tasks, people }: { tasks: T[]; people: P[] }) {
  const [view, setView] = useState<string>("next");
  const [ctx, setCtx] = useState<string>("");
  const filtered = tasks.filter((t) => t.buckets.includes(view) && (!ctx || t.contexts.includes(ctx)));
  const count = (k: string) => tasks.filter((t) => t.buckets.includes(k)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={view === v.key ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground" : "rounded-lg border px-3 py-1.5 text-sm hover:bg-secondary"}>
            {v.label} <span className="opacity-70">{count(v.key)}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground">Context:</span>
        <button onClick={() => setCtx("")} className={!ctx ? "rounded bg-primary px-1.5 py-0.5 text-primary-foreground" : "rounded border px-1.5 py-0.5"}>all</button>
        {CONTEXTS.map((c) => <button key={c} onClick={() => setCtx(c)} className={ctx === c ? "rounded bg-primary px-1.5 py-0.5 text-primary-foreground" : "rounded border px-1.5 py-0.5"}>{c}</button>)}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <div className="max-w-2xl space-y-2">{filtered.map((t) => <TaskRow key={t.id} task={t} people={people} />)}</div>
      )}
    </div>
  );
}
