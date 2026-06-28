"use client";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { captureInbox } from "@/lib/actions";

export function InboxQuickAdd() {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  function submit() {
    const v = text.trim();
    if (!v) return;
    start(() => captureInbox(v));
    setText("");
    inputRef.current?.focus();
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mb-5 flex gap-2">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a to-do or stray thought… (Enter to add, then clarify below)"
        aria-label="Add to inbox"
        className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={pending || !text.trim()}
        className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </form>
  );
}
