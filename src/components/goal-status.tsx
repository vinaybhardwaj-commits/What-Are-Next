"use client";
import { useTransition } from "react";
import { updateGoal } from "@/lib/actions";

const COLOR: Record<string, string> = { not_started: "#64748B", active: "#0055FF", at_risk: "#F59E0B", done: "#16A34A", dropped: "#94A3B8" };
const STATUSES = ["not_started", "active", "at_risk", "done", "dropped"];

export function GoalStatus({ id, status }: { id: string; status: string }) {
  const [, start] = useTransition();
  return (
    <select value={status} onChange={(e) => start(() => updateGoal(id, { status: e.target.value }))}
      className="rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: COLOR[status] }}>
      {STATUSES.map((s) => <option key={s} value={s} className="text-foreground">{s.replace("_", " ")}</option>)}
    </select>
  );
}
