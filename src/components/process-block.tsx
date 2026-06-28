"use client";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProcess, addProcessStep, setStepStatus, setStepOwner, removeStep } from "@/lib/actions";

type P = { id: string; name: string };
type Step = { id: string; stepNo: number; text: string; status: string; ownerPersonId: string | null };
type Proc = { id: string; title: string; steps: Step[] };
const STATUS = ["pending", "in_progress", "done", "blocked"];
const STATUS_COLOR: Record<string, string> = { pending: "#64748B", in_progress: "#0055FF", done: "#16A34A", blocked: "#F96EB1" };

export function ProcessBlock({ nodeType, nodeId, processes, people }: { nodeType: string; nodeId: string; processes: Proc[]; people: P[] }) {
  const [title, setTitle] = useState("");
  const [, start] = useTransition();
  return (
    <div className="space-y-4">
      {processes.map((proc) => (
        <div key={proc.id} className="rounded-xl border bg-card p-4">
          <div className="mb-2 font-medium text-foreground">{proc.title}</div>
          <ol className="space-y-1.5">
            {proc.steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-xs text-muted-foreground">{s.stepNo}.</span>
                <span className={cn("flex-1", s.status === "done" && "text-muted-foreground line-through")}>{s.text}</span>
                <select value={s.ownerPersonId ?? ""} onChange={(e) => start(() => setStepOwner(s.id, e.target.value || null, nodeType, nodeId))} className="rounded border bg-card px-1 py-0.5 text-xs">
                  <option value="">owner…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={s.status} onChange={(e) => start(() => setStepStatus(s.id, e.target.value, nodeType, nodeId))} className="rounded border px-1 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: STATUS_COLOR[s.status] }}>
                  {STATUS.map((st) => <option key={st} value={st} className="text-foreground">{st}</option>)}
                </select>
                <button onClick={() => start(() => removeStep(s.id, nodeType, nodeId))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
          <AddStep onAdd={(t) => start(() => addProcessStep(proc.id, t, nodeType, nodeId))} />
        </div>
      ))}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = title.trim(); if (t) start(() => createProcess(nodeType as any, nodeId, t)); setTitle(""); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New process / SOP name…" className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button className="inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><Plus className="h-4 w-4" /> Process</button>
      </form>
    </div>
  );
}

function AddStep({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t); setT(""); } }}>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Add a step…" className="h-8 flex-1 rounded border border-input px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
      <button className="rounded border px-2 text-xs">Add step</button>
    </form>
  );
}
