"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { captureInbox } from "@/lib/actions";

export function Capture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
      if (!typing && e.key === "c" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  function submit() {
    const v = text.trim(); if (!v) return;
    start(() => captureInbox(v)); setText(""); setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 md:bottom-6 md:left-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        aria-label="Capture (c)">
        <Plus className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-6 pt-32" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider font-mono text-muted-foreground">Capture to inbox</div>
            <input ref={ref} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="What's on your mind? (Enter to capture)"
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <div className="mt-2 text-right">
              <button onClick={submit} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Capture</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
