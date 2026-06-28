"use client";
import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { renameNode } from "@/lib/actions";

export function EditableTitle({ kind, id, value }: { kind: "goal" | "initiative" | "action" | "task"; id: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [, start] = useTransition();

  function save() {
    const next = v.trim() || value;
    setEditing(false);
    if (next !== value) start(() => renameNode(kind, id, next));
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setV(value); setEditing(false); } }}
          className="w-full rounded-lg border border-input px-2 py-1 text-2xl font-semibold text-even-navy outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={save} className="text-health-green" aria-label="Save"><Check className="h-5 w-5" /></button>
        <button onClick={() => { setV(value); setEditing(false); }} className="text-muted-foreground" aria-label="Cancel"><X className="h-5 w-5" /></button>
      </div>
    );
  }
  return (
    <h1 className="group flex items-center gap-2 text-2xl font-semibold text-even-navy">
      <span>{value}</span>
      <button onClick={() => { setV(value); setEditing(true); }} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground" aria-label="Rename"><Pencil className="h-4 w-4" /></button>
    </h1>
  );
}
