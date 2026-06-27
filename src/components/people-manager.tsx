"use client";
import { useState, useTransition } from "react";
import { UserPlus, X, Pencil, Check } from "lucide-react";
import { Avatar } from "@/components/avatars";
import { createPerson, archivePerson, updatePerson } from "@/lib/actions";

type P = { id: string; name: string; role: string | null; color: string };

function PersonChip({ p }: { p: P }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [role, setRole] = useState(p.role ?? "");
  const [, start] = useTransition();

  function save() {
    const n = name.trim() || p.name;
    setEditing(false);
    start(() => updatePerson(p.id, { name: n, role: role.trim() || null }));
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-white py-1 pl-2 pr-1.5 text-sm shadow-sm">
        <Avatar name={name || p.name} color={p.color} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-24 rounded border border-input px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="role"
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-24 rounded border border-input px-1.5 py-0.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={save} className="text-health-green" aria-label="Save"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={() => { setName(p.name); setRole(p.role ?? ""); setEditing(false); }} className="text-muted-foreground" aria-label="Cancel"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }
  return (
    <span className="group inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 py-1 pl-1 pr-2 text-sm">
      <Avatar name={p.name} color={p.color} />
      <span className="font-medium text-even-navy">{p.name}</span>
      {p.role ? <span className="text-xs text-muted-foreground">· {p.role}</span> : <span className="text-xs italic text-muted-foreground/60">· no role</span>}
      <button onClick={() => setEditing(true)} className="ml-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground" aria-label={`Edit ${p.name}`}><Pencil className="h-3 w-3" /></button>
      <button onClick={() => { if (confirm(`Remove ${p.name} from the roster? (kept in history)`)) start(() => archivePerson(p.id)); }}
        className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label={`Remove ${p.name}`}><X className="h-3.5 w-3.5" /></button>
    </span>
  );
}

export function PeopleManager({ people }: { people: P[] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [, start] = useTransition();
  return (
    <div className="mb-6 rounded-xl border bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-even-navy">Roster <span className="font-normal text-muted-foreground">({people.length}) — hover a name to edit role or remove</span></div>
      <div className="mb-3 flex flex-wrap gap-2">
        {people.map((p) => <PersonChip key={p.id} p={p} />)}
      </div>
      <form className="flex flex-wrap gap-2"
        onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return; start(() => createPerson(n, role)); setName(""); setRole(""); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-9 w-44 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" className="h-9 w-44 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><UserPlus className="h-4 w-4" /> Add person</button>
      </form>
    </div>
  );
}
