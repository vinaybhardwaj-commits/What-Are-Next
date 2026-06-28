"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Target, Home, Inbox, ListChecks, Users, RefreshCw, Plus } from "lucide-react";
import { captureInbox, createGoal } from "@/lib/actions";

type Node = { type: string; id: string; title: string; href: string };
type Item = { key: string; label: string; sub?: string; icon: any; run: () => void };

const NAV = [
  { label: "Home", href: "/", icon: Home },
  { label: "Strategy", href: "/strategy", icon: Target },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "GTD Lists", href: "/gtd", icon: ListChecks },
  { label: "People", href: "/people", icon: Users },
  { label: "Weekly Review", href: "/review", icon: RefreshCw },
];

export function CommandPalette({ index }: { index: Node[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const [, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const items: Item[] = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const nav = NAV.filter((n) => !ql || n.label.toLowerCase().includes(ql))
      .map((n) => ({ key: "nav-" + n.href, label: n.label, sub: "Go", icon: n.icon, run: () => go(n.href) }));
    const nodes = index.filter((n) => !ql || n.title.toLowerCase().includes(ql)).slice(0, 8)
      .map((n) => ({ key: n.id, label: n.title, sub: n.type, icon: n.type === "goal" ? Target : ListChecks, run: () => go(n.href) }));
    const creates: Item[] = ql ? [
      { key: "capture", label: `Capture “${q.trim()}” to Inbox`, sub: "Capture", icon: Plus, run: () => { setOpen(false); start(() => captureInbox(q.trim())); } },
      { key: "newgoal", label: `New goal “${q.trim()}”`, sub: "Create", icon: Target, run: () => { setOpen(false); start(async () => { const id = await createGoal(q.trim()); if (id) router.push(`/n/goal/${id}`); }); } },
    ] : [];
    return [...nav, ...nodes, ...creates];
  }, [q, index]);

  useEffect(() => { if (sel >= items.length) setSel(0); }, [items.length, sel]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 p-6 pt-28" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); }
            }}
            placeholder="Jump to a goal or initiative, capture, or create…" className="flex-1 text-sm outline-none" />
          <kbd className="rounded border px-1 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>}
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={it.key}>
                <button onMouseEnter={() => setSel(i)} onClick={it.run}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === sel ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.sub && <span className={`text-[10px] uppercase tracking-wider font-mono ${i === sel ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{it.sub}</span>}
                  {i === sel && <CornerDownLeft className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
