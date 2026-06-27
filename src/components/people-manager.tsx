"use client";
import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/avatars";
import { createPerson, archivePerson } from "@/lib/actions";

type P = { id: string; name: string; role: string | null; color: string };

export function PeopleManager({ people }: { people: P[] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [, start] = useTransition();
  return (
    <div className="mb-6 rounded-xl border bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-even-navy">Roster <span className="font-normal text-muted-foreground">({people.length})</span></div>
      <div className="mb-3 flex flex-wrap gap-2">
        {people.map((p) => (
          <span key={p.id} className="group inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 py-1 pl-1 pr-2 text-sm">
            <Avatar name={p.name} color={p.color} />
            <span className="font-medium text-even-navy">{p.name}</span>
            {p.role && <span className="text-xs text-muted-foreground">· {p.role}</span>}
            <button onClick={() => { if (confirm(`Remove ${p.name} from the roster? (kept in history)`)) start(() => archivePerson(p.id)); }}
              className="ml-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive" aria-label={`Remove ${p.name}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
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
