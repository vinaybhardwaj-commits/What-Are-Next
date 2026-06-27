"use client";
import { useState, useTransition } from "react";
import { updateGoal } from "@/lib/actions";

export function GoalHorizon({ id, horizon }: { id: string; horizon: string | null }) {
  const [v, setV] = useState(horizon ?? "");
  const [, start] = useTransition();
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => start(() => updateGoal(id, { targetHorizon: v.trim() || null }))}
      placeholder="Target horizon (e.g. Q3 2026)" className="h-7 w-44 rounded border border-input px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
  );
}
