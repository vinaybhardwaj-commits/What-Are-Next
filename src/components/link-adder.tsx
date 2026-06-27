"use client";
import { useState, useTransition } from "react";
import { ExternalLink, X, Plus, Loader2 } from "lucide-react";
import { addProjectLink, removeProjectLink } from "@/lib/actions";

type Link = { id: string; url: string; type: string; title: string | null; preview: { title?: string; description?: string; image?: string; site?: string } | null };
const TYPES = ["linear", "notion", "drive", "prd", "github", "vercel", "other"];
const BADGE: Record<string, string> = { linear: "#5E6AD2", notion: "#000", drive: "#1FA463", prd: "#0055FF", github: "#24292E", vercel: "#000", other: "#64748B" };

export function LinkAdder({ nodeType, nodeId, links }: { nodeType: string; nodeId: string; links: Link[] }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("other");
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  function add() {
    const u = url.trim(); if (!u) return;
    setBusy(true);
    start(async () => { await addProjectLink(nodeType as any, nodeId, u, type as any); setUrl(""); setBusy(false); });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {links.map((l) => {
          const title = l.preview?.title || l.title || l.url;
          return (
            <div key={l.id} className="group relative flex w-72 items-start gap-3 rounded-xl border bg-white p-3">
              {l.preview?.image ? <img src={l.preview.image} alt="" className="h-12 w-12 rounded object-cover" /> : null}
              <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white" style={{ backgroundColor: BADGE[l.type] || "#64748B" }}>{l.type}</span>
                  {l.preview?.site && <span className="truncate text-[10px] text-muted-foreground">{l.preview.site}</span>}
                </div>
                <div className="truncate text-sm font-medium text-even-navy">{title}</div>
                {l.preview?.description && <div className="line-clamp-2 text-[11px] text-muted-foreground">{l.preview.description}</div>}
                <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary"><ExternalLink className="h-3 w-3" />open</div>
              </a>
              <button onClick={() => start(() => removeProjectLink(l.id, nodeType, nodeId))} className="absolute -right-2 -top-2 hidden rounded-full bg-white p-0.5 shadow group-hover:block" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border bg-white px-2 text-sm">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a Linear/Notion/Drive/PRD URL…" onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          className="h-9 flex-1 rounded-lg border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
    </div>
  );
}
