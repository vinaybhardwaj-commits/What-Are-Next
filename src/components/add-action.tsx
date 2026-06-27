"use client";
import { useState, useTransition } from "react";
import { createAction } from "@/lib/actions";

export function AddAction({ initiativeId }: { initiativeId: string }) {
  const [title, setTitle] = useState("");
  const [, start] = useTransition();
  return (
    <form className="mt-3 flex gap-2"
      onSubmit={(e) => { e.preventDefault(); const v = title.trim(); if (v) start(() => createAction(initiativeId, v)); setTitle(""); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add an action…"
        className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <button className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Add</button>
    </form>
  );
}
