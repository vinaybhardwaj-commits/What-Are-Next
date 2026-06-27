"use client";
import { useState, useTransition } from "react";
import { Plus, Settings2, X } from "lucide-react";
import { TaskRow, type RowTask } from "@/components/task-row";
import { addTaskToList, addContext, removeContext } from "@/lib/actions";

type T = RowTask & { buckets: string[] };
type P = { id: string; name: string; color: string };

const VIEWS = [
  { key: "next", label: "Next Actions", desc: "Everything you can act on right now. Add one below.", add: "next" as const, addLabel: "Add a next action…" },
  { key: "waiting", label: "Waiting On", desc: "Delegated to, or blocked on, a person. Items land here when you set “waiting on” someone on a task.", add: null },
  { key: "scheduled", label: "Scheduled / Tickler", desc: "Deferred to a date. Items land here when you set a “defer until” date on a task.", add: null },
  { key: "someday", label: "Someday / Maybe", desc: "Not now — parked for later review. Add one below.", add: "someday" as const, addLabel: "Add a someday / maybe…" },
  { key: "blocked", label: "Blocked", desc: "Has an active blocker. Items land here when you add a blocker to a task.", add: null },
] as const;

export function GtdLists({ tasks, people, contexts }: { tasks: T[]; people: P[]; contexts: string[] }) {
  const [view, setView] = useState<string>("next");
  const [ctx, setCtx] = useState<string>("");
  const [title, setTitle] = useState("");
  const [manage, setManage] = useState(false);
  const [newCtx, setNewCtx] = useState("");
  const [, start] = useTransition();
  const meta = VIEWS.find((v) => v.key === view)!;
  const filtered = tasks.filter((t) => t.buckets.includes(view) && (!ctx || t.contexts.includes(ctx)));
  const count = (k: string) => tasks.filter((t) => t.buckets.includes(k)).length;

  function add() {
    const t = title.trim(); if (!t || !meta.add) return;
    start(() => addTaskToList(t, meta.add!, ctx ? [ctx] : []));
    setTitle("");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={view === v.key ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground" : "rounded-lg border px-3 py-1.5 text-sm hover:bg-secondary"}>
            {v.label} <span className="opacity-70">{count(v.key)}</span>
          </button>
        ))}
      </div>

      <p className="mb-3 text-sm text-muted-foreground">{meta.desc}</p>

      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground">Context:</span>
        <button onClick={() => setCtx("")} className={!ctx ? "rounded bg-primary px-1.5 py-0.5 text-primary-foreground" : "rounded border px-1.5 py-0.5"}>all</button>
        {contexts.map((c) => (
          <span key={c} className="inline-flex items-center">
            <button onClick={() => setCtx(c)} className={ctx === c ? "rounded-l bg-primary px-1.5 py-0.5 text-primary-foreground" : "rounded-l border px-1.5 py-0.5"}>{c}</button>
            {manage && <button onClick={() => { if (confirm(`Remove context ${c}? (kept on any tasks already tagged)`)) start(() => removeContext(c)); }} className="rounded-r border border-l-0 px-1 py-0.5 text-destructive hover:bg-destructive/10" aria-label={`Remove ${c}`}><X className="h-3 w-3" /></button>}
          </span>
        ))}
        <button onClick={() => setManage((m) => !m)} className="ml-1 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-muted-foreground hover:bg-secondary">
          <Settings2 className="h-3 w-3" /> {manage ? "done" : "edit"}
        </button>
      </div>
      {manage && (
        <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = newCtx.trim(); if (v) start(() => addContext(v)); setNewCtx(""); }}>
          <input value={newCtx} onChange={(e) => setNewCtx(e.target.value)} placeholder="New context — e.g. phone, ot, board (the @ is added for you)"
            className="h-8 w-80 rounded-lg border border-input px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
          <button className="inline-flex items-center gap-1 rounded-lg border px-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add context</button>
        </form>
      )}

      {meta.add && (
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.addLabel}
            className="h-10 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {meta.add ? "Nothing here yet — add one above, capture with “c”, or clarify your Inbox." : meta.desc}
        </div>
      ) : (
        <div className="space-y-2">{filtered.map((t) => <TaskRow key={t.id} task={t} people={people} contexts={contexts} />)}</div>
      )}
    </div>
  );
}
