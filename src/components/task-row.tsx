"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Lock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  completeTask, reopenTask, setWaitingOn, setAssignee, addBlocker, setDefer, dropTask, setContexts,
} from "@/lib/actions";

type P = { id: string; name: string; color: string };
export type RowTask = {
  id: string; title: string; gtdStatus: string; contexts: string[];
  assignee: P | null; waitingOn: P | null; waitingDays: number | null;
  blocked: boolean; blockers: { id: string; label: string }[];
  path: { domain?: { name: string; color: string }; initiative?: { id: string; title: string } };
};

const DEFAULT_CONTEXTS = ["@home", "@clinic", "@deep-work", "@calls", "@claude-code", "@errand", "@review"];

export function TaskRow({ task, people, contexts = DEFAULT_CONTEXTS }: { task: RowTask; people: P[]; contexts?: string[] }) {
  const [, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const done = task.gtdStatus === "done";

  return (
    <div className={cn("rounded-lg border bg-white", task.blocked && "border-destructive/40")}>
      <div className="flex items-start gap-2 px-3 py-2">
        <input type="checkbox" checked={done} className="mt-1"
          onChange={(e) => start(() => (e.target.checked ? completeTask(task.id) : reopenTask(task.id)))} />
        <div className="min-w-0 flex-1">
          <Link href={`/n/task/${task.id}`} className={cn("block text-sm", done && "text-muted-foreground line-through")}>{task.title}</Link>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {task.path.domain && <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: task.path.domain.color + "22", color: task.path.domain.color }}>{task.path.initiative?.title ?? task.path.domain.name}</span>}
            {task.contexts.map((c) => <span key={c} className="rounded bg-secondary px-1.5 py-0.5">{c}</span>)}
            {task.blocked && <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-destructive"><Lock className="h-3 w-3" />blocked{task.blockers[0] ? `: ${task.blockers[0].label}` : ""}</span>}
            {task.waitingOn && <span className="inline-flex items-center gap-1 rounded bg-health-amber/15 px-1.5 py-0.5 text-health-amber"><Clock className="h-3 w-3" />waiting on {task.waitingOn.name}{task.waitingDays != null ? ` · ${task.waitingDays}d` : ""}</span>}
            {task.assignee && !task.waitingOn && <span>→ {task.assignee.name}</span>}
          </div>
        </div>
        <button onClick={() => setMenu((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label="Task actions"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      {menu && (
        <div className="space-y-2 border-t bg-secondary/40 px-3 py-2 text-xs">
          <Picker label="Waiting on" people={people} onPick={(pid) => start(() => setWaitingOn(task.id, pid))} clearLabel="Not waiting" onClear={() => start(() => setWaitingOn(task.id, null))} />
          <Picker label="Delegate to" people={people} onPick={(pid) => start(() => setAssignee(task.id, pid))} clearLabel="Clear" onClear={() => start(() => setAssignee(task.id, null))} />
          <Inline label="Block (reason)" placeholder="procurement approval…" onSubmit={(v) => start(() => addBlocker(task.id, { externalLabel: v }))} />
          <Inline label="Defer until" type="date" onSubmit={(v) => start(() => setDefer(task.id, v))} />
          <div className="flex flex-wrap gap-1">
            {contexts.map((c) => {
              const on = task.contexts.includes(c);
              return <button key={c} onClick={() => start(() => setContexts(task.id, on ? task.contexts.filter((x) => x !== c) : [...task.contexts, c]))}
                className={cn("rounded px-1.5 py-0.5", on ? "bg-primary text-primary-foreground" : "bg-white border")}>{c}</button>;
            })}
          </div>
          <button onClick={() => start(() => dropTask(task.id))} className="text-destructive">Drop task</button>
        </div>
      )}
    </div>
  );
}

function Picker({ label, people, onPick, onClear, clearLabel }: { label: string; people: P[]; onPick: (id: string) => void; onClear: () => void; clearLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <select className="rounded border bg-white px-1.5 py-1" defaultValue="" onChange={(e) => { if (e.target.value === "__clear") onClear(); else if (e.target.value) onPick(e.target.value); e.currentTarget.value = ""; }}>
        <option value="" disabled>pick…</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="__clear">{clearLabel}</option>
      </select>
    </div>
  );
}

function Inline({ label, placeholder, type = "text", onSubmit }: { label: string; placeholder?: string; type?: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSubmit(v); setV(""); } }}>
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <input type={type} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} className="flex-1 rounded border bg-white px-1.5 py-1" />
      <button className="rounded bg-primary px-2 py-1 text-white">Set</button>
    </form>
  );
}
