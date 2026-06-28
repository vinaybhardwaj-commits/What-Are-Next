"use client";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  setGtdStatus, setAssignee, setWaitingOn, setPriority, setContexts, setDue, setDefer,
  addBlocker, resolveBlocker, completeTask, reopenTask, updateNotes,
} from "@/lib/actions";

type P = { id: string; name: string; color: string };
type Dep = { id: string; state: string; externalLabel: string | null; resolutionNote: string | null; blockerNodeType: string | null };
type Task = {
  id: string; title: string; notes: string | null; gtdStatus: string; contexts: string[];
  priority: number | null; assigneePersonId: string | null; waitingOnPersonId: string | null;
  dueDate: string | null; deferUntil: string | null; completionNote: string | null;
};

const STATUSES = ["inbox", "next", "waiting", "scheduled", "someday", "done", "dropped"];
const DEFAULT_CONTEXTS = ["@home", "@clinic", "@deep-work", "@calls", "@claude-code", "@errand", "@review"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>;
}

export function TaskDetail({ task, people, deps, contexts = DEFAULT_CONTEXTS }: { task: Task; people: P[]; deps: Dep[]; contexts?: string[] }) {
  const [, start] = useTransition();
  const [notes, setNotes] = useState(task.notes ?? "");
  const [compNote, setCompNote] = useState("");
  const [blockLabel, setBlockLabel] = useState("");
  const active = deps.filter((d) => d.state === "active");
  const resolved = deps.filter((d) => d.state === "resolved");
  const done = task.gtdStatus === "done";
  const sel = "rounded border bg-card px-2 py-1.5 text-sm";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Status">
          <select className={sel} value={task.gtdStatus} onChange={(e) => start(() => setGtdStatus(task.id, e.target.value as any))}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Delegate to">
          <select className={sel} value={task.assigneePersonId ?? ""} onChange={(e) => start(() => setAssignee(task.id, e.target.value || null))}>
            <option value="">— none —</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Waiting on">
          <select className={sel} value={task.waitingOnPersonId ?? ""} onChange={(e) => start(() => setWaitingOn(task.id, e.target.value || null))}>
            <option value="">— no one —</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={sel} value={task.priority ?? ""} onChange={(e) => start(() => setPriority(task.id, e.target.value ? Number(e.target.value) : null))}>
            <option value="">—</option><option value="1">1 (high)</option><option value="2">2</option><option value="3">3</option>
          </select>
        </Field>
        <Field label="Due"><input type="date" className={sel} defaultValue={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => start(() => setDue(task.id, e.target.value || null))} /></Field>
        <Field label="Defer until (tickler)"><input type="date" className={sel} defaultValue={task.deferUntil?.slice(0, 10) ?? ""} onChange={(e) => start(() => setDefer(task.id, e.target.value || null))} /></Field>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted-foreground">Contexts</div>
        <div className="flex flex-wrap gap-1">
          {contexts.map((c) => {
            const on = task.contexts.includes(c);
            return <button key={c} onClick={() => start(() => setContexts(task.id, on ? task.contexts.filter((x) => x !== c) : [...task.contexts, c]))}
              className={cn("rounded px-2 py-0.5 text-xs", on ? "bg-primary text-primary-foreground" : "border bg-card")}>{c}</button>;
          })}
        </div>
      </div>

      {/* Blockers */}
      <div>
        <div className="mb-2 text-sm font-semibold text-foreground">Blockers</div>
        {active.length === 0 && <p className="text-sm text-muted-foreground">No active blockers.</p>}
        <div className="space-y-2">
          {active.map((d) => <ResolveBlocker key={d.id} dep={d} />)}
        </div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (blockLabel.trim()) { start(() => addBlocker(task.id, { externalLabel: blockLabel })); setBlockLabel(""); } }}>
          <input value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} placeholder="Add a blocker (e.g. procurement approval)…"
            className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="rounded-lg border px-3 text-sm">Block</button>
        </form>
        {resolved.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {resolved.map((d) => <div key={d.id}>✓ {d.externalLabel || "dependency"} — <span className="italic">{d.resolutionNote}</span></div>)}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="mb-2 text-sm font-semibold text-foreground">Notes</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Notes (markdown)…" />
        <button onClick={() => start(() => updateNotes("task", task.id, notes))} className="mt-2 rounded-lg border px-3 py-1.5 text-sm">Save notes</button>
      </div>

      {/* Completion */}
      <div className="rounded-xl border p-4">
        {done ? (
          <div className="flex items-center justify-between">
            <div className="text-sm"><span className="font-medium text-health-green">Completed.</span>{task.completionNote && <span className="text-muted-foreground"> — {task.completionNote}</span>}</div>
            <button onClick={() => start(() => reopenTask(task.id))} className="rounded-lg border px-3 py-1.5 text-sm">Reopen</button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Field label="Completion note (optional)"><input value={compNote} onChange={(e) => setCompNote(e.target.value)} placeholder="how it was done / outcome…" className="h-9 w-80 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></Field>
            <button onClick={() => start(() => completeTask(task.id, compNote))} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Complete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResolveBlocker({ dep }: { dep: Dep }) {
  const [note, setNote] = useState("");
  const [, start] = useTransition();
  return (
    <form className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2"
      onSubmit={(e) => { e.preventDefault(); if (note.trim()) start(() => resolveBlocker(dep.id, note)); }}>
      <span className="text-sm text-destructive">{dep.externalLabel || "dependency"}</span>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="how was it removed?"
        className="h-8 flex-1 rounded border bg-card px-2 text-xs outline-none" />
      <button className="rounded bg-health-green px-2 py-1 text-xs font-medium text-white">Resolve</button>
    </form>
  );
}
