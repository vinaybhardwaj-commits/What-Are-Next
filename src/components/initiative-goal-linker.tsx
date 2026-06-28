"use client";
import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { setInitiativeGoals } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function InitiativeGoalLinker({ initiativeId, selected, goals }: {
  initiativeId: string; selected: string[]; goals: { id: string; title: string }[];
}) {
  const [, start] = useTransition();
  const [sel, setSel] = useState<string[]>(selected);
  function toggle(id: string) {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next);
    start(() => setInitiativeGoals(initiativeId, next));
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="inline-flex items-center gap-1 text-muted-foreground"><Target className="h-4 w-4" /><span className="eyebrow">Strategies</span></span>
      {goals.length === 0 ? (
        <span className="text-xs text-muted-foreground">No goals yet — create one in Strategy.</span>
      ) : goals.map((g) => {
        const on = sel.includes(g.id);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => toggle(g.id)}
            aria-pressed={on}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-colors",
              on ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={on ? "text-primary" : "text-muted-foreground"}>◎</span>
            {g.title}
          </button>
        );
      })}
    </div>
  );
}
