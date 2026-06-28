"use client";
import { useState, useTransition } from "react";
import { setGoalDomains } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Dom = { id: string; name: string; color: string };

export function GoalDomains({ goalId, allDomains, selected }: { goalId: string; allDomains: Dom[]; selected: string[] }) {
  const [, start] = useTransition();
  const [sel, setSel] = useState<string[]>(selected);
  function toggle(id: string) {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next);
    start(() => setGoalDomains(goalId, next));
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="eyebrow mr-0.5">Domains</span>
      {allDomains.map((d) => {
        const on = sel.includes(d.id);
        const color = d.color || "#2A6DFF";
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => toggle(d.id)}
            aria-pressed={on}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              on ? "text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
            style={on ? { backgroundColor: color + "22", borderColor: color + "66" } : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: on ? color : "transparent", outline: on ? "none" : `1px solid ${color}99` }} />
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
