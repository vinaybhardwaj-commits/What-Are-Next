"use client";
import { useState, useTransition } from "react";
import { createTask, toggleTask } from "@/lib/actions";

type T = { id: string; title: string; gtdStatus: string };

export function TaskList({ actionId, tasks }: { actionId: string; tasks: T[] }) {
  const [title, setTitle] = useState("");
  const [, start] = useTransition();
  return (
    <div className="space-y-2">
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
      {tasks.map((t) => {
        const done = t.gtdStatus === "done";
        return (
          <label key={t.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
            <input type="checkbox" checked={done}
              onChange={(e) => start(() => toggleTask(t.id, e.target.checked, actionId))} />
            <span className={done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
          </label>
        );
      })}
      <form className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); const v = title.trim(); if (v) start(() => createTask(actionId, v)); setTitle(""); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…"
          className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Add</button>
      </form>
    </div>
  );
}
