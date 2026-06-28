"use client";
import { useTransition } from "react";
import { Target } from "lucide-react";
import { linkInitiativeToGoal } from "@/lib/actions";

export function InitiativeGoalLinker({ initiativeId, goalId, goals }: { initiativeId: string; goalId: string | null; goals: { id: string; title: string }[] }) {
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-2 text-sm">
      <Target className="h-4 w-4 text-muted-foreground" />
      <select value={goalId ?? ""} onChange={(e) => start(() => linkInitiativeToGoal(initiativeId, e.target.value || null))}
        className="rounded-lg border bg-card px-2 py-1.5 text-sm">
        <option value="">— not linked to a goal —</option>
        {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>
    </div>
  );
}
