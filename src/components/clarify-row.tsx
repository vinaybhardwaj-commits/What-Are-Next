"use client";
import { useState, useTransition } from "react";
import { clarifyToTask, clarifyDrop } from "@/lib/actions";

type Ini = { id: string; title: string };
type P = { id: string; name: string };
const CONTEXTS = ["@home", "@clinic", "@deep-work", "@calls", "@claude-code", "@errand", "@review"];

export function ClarifyRow({ item, initiatives, people }: { item: { id: string; rawText: string }; initiatives: Ini[]; people: P[] }) {
  const [title, setTitle] = useState(item.rawText);
  const [initiativeId, setInitiativeId] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [contexts, setContexts] = useState<string[]>([]);
  const [due, setDue] = useState("");
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-white p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {!open ? (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Clarify → Task</button>
          <button onClick={() => start(() => clarifyDrop(item.id, "someday"))} className="rounded-lg border px-3 py-1.5 text-sm">Someday</button>
          <button onClick={() => start(() => clarifyDrop(item.id, "drop"))} className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground">Drop</button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Initiative</span>
              <select value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)} className="rounded border bg-white px-2 py-1.5">
                <option value="">— none —</option>
                {initiatives.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Waiting on</span>
              <select value={waitingOn} onChange={(e) => setWaitingOn(e.target.value)} className="rounded border bg-white px-2 py-1.5">
                <option value="">— no one —</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Due</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-44 rounded border bg-white px-2 py-1.5" />
          </label>
          <div className="flex flex-wrap gap-1">
            {CONTEXTS.map((c) => {
              const on = contexts.includes(c);
              return <button key={c} type="button" onClick={() => setContexts(on ? contexts.filter((x) => x !== c) : [...contexts, c])}
                className={on ? "rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground" : "rounded border bg-white px-1.5 py-0.5 text-xs"}>{c}</button>;
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => start(() => clarifyToTask(item.id, { title, initiativeId: initiativeId || null, waitingOnPersonId: waitingOn || null, contexts, dueDate: due || null }))}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">File as Next Action</button>
            <button onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
