"use client";
import { useState, useTransition } from "react";
import { Plus, X, AlertTriangle, Link2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveDiagnosis, setGuidingPrinciples, addCoherentAction, linkCoherentAction, removeCoherentAction, updateCoherentAction,
} from "@/lib/actions";

type Ini = { id: string; title: string };
type CA = { id: string; text: string; linkedNodeId: string | null; linkedTitle: string | null };

export function KernelEditor({ goalId, kernelId, diagnosis, principles, coherent, allInitiatives }: {
  goalId: string; kernelId: string; diagnosis: string | null; principles: string[]; coherent: CA[]; allInitiatives: Ini[];
}) {
  const [, start] = useTransition();
  const [diag, setDiag] = useState(diagnosis ?? "");
  const [savedDiag, setSavedDiag] = useState(false);
  const [newPrinciple, setNewPrinciple] = useState("");
  const [newAction, setNewAction] = useState("");

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">Everything here saves automatically as you add it — principles and coherent actions persist the moment you press <span className="font-medium">+</span>. The diagnosis saves when you click away (or hit Save).</p>
      {/* Diagnosis */}
      <div>
        <div className="mb-1 text-sm font-semibold text-foreground">Diagnosis <span className="font-normal text-muted-foreground">— what's actually going on / the crux</span></div>
        <textarea value={diag}
          onChange={(e) => { setDiag(e.target.value); setSavedDiag(false); }}
          onBlur={() => { if (diag !== (diagnosis ?? "")) start(async () => { await saveDiagnosis(kernelId, goalId, diag); setSavedDiag(true); }); }}
          rows={3}
          className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Name the real crux this goal addresses…" />
        <div className="mt-1 flex items-center gap-2">
          <button onClick={() => start(async () => { await saveDiagnosis(kernelId, goalId, diag); setSavedDiag(true); })}
            className="rounded-lg border px-3 py-1 text-xs">Save diagnosis</button>
          {savedDiag ? <span className="text-xs text-health-green">✓ Saved</span> : (diag !== (diagnosis ?? "") && diag) ? <span className="text-xs text-muted-foreground">saves when you click away…</span> : null}
        </div>
      </div>

      {/* Guiding principles */}
      <div>
        <div className="mb-1 text-sm font-semibold text-foreground">Guiding principles <span className="font-normal text-muted-foreground">— the policy / how we'll win</span></div>
        <ul className="space-y-1">
          {principles.map((p, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <span className="flex-1">{p}</span>
              <button onClick={() => start(() => setGuidingPrinciples(kernelId, goalId, principles.filter((_, j) => j !== i)))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = newPrinciple.trim(); if (v) start(() => setGuidingPrinciples(kernelId, goalId, [...principles, v])); setNewPrinciple(""); }}>
          <input value={newPrinciple} onChange={(e) => setNewPrinciple(e.target.value)} placeholder="Add a guiding principle…" className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><Plus className="h-4 w-4" /></button>
        </form>
      </div>

      {/* Coherent actions */}
      <div>
        <div className="mb-1 text-sm font-semibold text-foreground">Coherent actions <span className="font-normal text-muted-foreground">— coordinated moves, each linked to real execution</span></div>
        <ul className="space-y-2">
          {coherent.map((c) => (
            <li key={c.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <CoherentText id={c.id} goalId={goalId} value={c.text} />
                <button onClick={() => start(() => removeCoherentAction(c.id, goalId))} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <select value={c.linkedNodeId ?? ""} onChange={(e) => start(() => linkCoherentAction(c.id, goalId, e.target.value || null))}
                  className="rounded border bg-card px-2 py-1 text-xs">
                  <option value="">— link to initiative —</option>
                  {allInitiatives.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
                </select>
                {!c.linkedNodeId && <span className="inline-flex items-center gap-1 rounded bg-health-amber/15 px-1.5 py-0.5 text-[11px] text-health-amber"><AlertTriangle className="h-3 w-3" />no execution</span>}
              </div>
            </li>
          ))}
        </ul>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = newAction.trim(); if (v) start(() => addCoherentAction(kernelId, goalId, v)); setNewAction(""); }}>
          <input value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder="Add a coherent action…" className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="inline-flex items-center gap-1 rounded-lg border px-3 text-sm"><Plus className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}

function CoherentText({ id, goalId, value }: { id: string; goalId: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [, start] = useTransition();
  function save() { const next = v.trim() || value; setEditing(false); if (next !== value) start(() => updateCoherentAction(id, goalId, next)); }
  if (editing) {
    return (
      <span className="flex flex-1 items-center gap-1">
        <input value={v} onChange={(e) => setV(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setV(value); setEditing(false); } }}
          className="flex-1 rounded border border-input px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={save} className="text-health-green"><Check className="h-3.5 w-3.5" /></button>
      </span>
    );
  }
  return (
    <span className="group flex flex-1 items-center gap-1.5">
      <span className="flex-1">{value}</span>
      <button onClick={() => { setV(value); setEditing(true); }} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"><Pencil className="h-3 w-3" /></button>
    </span>
  );
}
