"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Send, X, CornerDownLeft } from "lucide-react";
import { assistantTurn, runAssistantAction } from "@/lib/ai/capabilities";

type Cite = { title: string; href: string };
type Action = { kind: string; label: string; text: string; initiativeId: string | null };
type Msg = { role: "user" | "assistant"; content: string; citations?: Cite[]; action?: Action | null; done?: boolean };

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send() {
    const m = input.trim(); if (!m || busy) return;
    setInput(""); setMsgs((p) => [...p, { role: "user", content: m }]); setBusy(true);
    try {
      const r = await assistantTurn(threadRef.current, m);
      threadRef.current = r.threadId;
      setMsgs((p) => [...p, { role: "assistant", content: r.answer, citations: r.citations as Cite[], action: r.proposedAction }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "Sorry — I hit an error reaching the model." }]);
    } finally { setBusy(false); }
  }

  async function confirm(i: number, a: Action) {
    await runAssistantAction(a.kind, a.text, a.initiativeId);
    setMsgs((p) => p.map((x, j) => (j === i ? { ...x, done: true } : x)));
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-even-navy px-4 text-sm font-medium text-white shadow-lg hover:bg-even-navy/90"
        aria-label="Assistant (⌘J)">
        <Sparkles className="h-4 w-4 text-even-pink" /> Ask
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-even-pink" /><span className="font-semibold text-even-navy">Assistant</span><kbd className="rounded border px-1 text-[10px] text-muted-foreground">⌘J</kbd></div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Ask anything about your board — it reads the live data and cites what it used.</p>
                  <ul className="space-y-1 text-xs">
                    <li className="rounded bg-secondary px-2 py-1">"What's been waiting on Mohsin longest?"</li>
                    <li className="rounded bg-secondary px-2 py-1">"What should I focus on today?"</li>
                    <li className="rounded bg-secondary px-2 py-1">"Is my OPD goal coherent?"</li>
                  </ul>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-4 space-y-2"}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.citations.map((c, k) => <Link key={k} href={c.href} onClick={() => setOpen(false)} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20">{c.title}</Link>)}
                    </div>
                  )}
                  {m.action && !m.done && (
                    <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
                      <div className="mb-2 text-sm">{m.action.label}</div>
                      <button onClick={() => confirm(i, m.action!)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Confirm</button>
                    </div>
                  )}
                  {m.done && <div className="text-xs text-health-green">✓ Done</div>}
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading the board…</div>}
              <div ref={endRef} />
            </div>
            <div className="border-t p-3">
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Ask or instruct…" className="flex-1 text-sm outline-none" />
                <button onClick={send} disabled={busy} className="text-primary disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
