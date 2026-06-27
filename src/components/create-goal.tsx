"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createGoal } from "@/lib/actions";

export function CreateGoal() {
  const [title, setTitle] = useState("");
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <form className="mb-5 flex gap-2"
      onSubmit={(e) => { e.preventDefault(); const t = title.trim(); if (!t) return; start(async () => { const id = await createGoal(t); setTitle(""); if (id) router.push(`/n/goal/${id}`); }); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New quarter goal — e.g. Ship the OPD encounter intelligence stack"
        className="h-10 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> Goal</button>
    </form>
  );
}
