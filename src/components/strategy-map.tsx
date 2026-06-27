"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy, horizontalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Plus, Pencil, Archive, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthDot, type Health } from "@/components/health-dot";
import { AvatarStack } from "@/components/avatars";
import { Input } from "@/components/ui/input";
import {
  reorderDomains, reorderInitiatives, createDomain, renameDomain,
  recolorDomain, archiveDomain, toggleDomainCollapse, createInitiative,
} from "@/lib/actions";

type Ini = { id: string; title: string; gtdStatus: string; actionCount: number; health: Health; goalTitle?: string | null };
type Dom = {
  id: string; name: string; color: string; collapsed: boolean; health: Health;
  guides: { id: string; name: string; color: string }[]; initiatives: Ini[];
};

const SWATCHES = ["#0055FF", "#002054", "#F96EB1", "#16A34A", "#F59E0B", "#7C3AED", "#0891B2", "#DC2626"];

export function StrategyMap({ board }: { board: Dom[] }) {
  const [doms, setDoms] = useState(board);
  useEffect(() => setDoms(board), [board]);
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onBandDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = doms.findIndex((d) => d.id === active.id);
    const newI = doms.findIndex((d) => d.id === over.id);
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(doms, oldI, newI);
    setDoms(next);
    start(() => reorderDomains(next.map((d) => d.id)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBandDragEnd}>
      <SortableContext items={doms.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {doms.map((d) => (
            <Band key={d.id} dom={d}
              onLocalReorder={(ids) => {
                setDoms((prev) => prev.map((x) => x.id === d.id
                  ? { ...x, initiatives: ids.map((id) => x.initiatives.find((i) => i.id === id)!).filter(Boolean) }
                  : x));
                start(() => reorderInitiatives(ids));
              }} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <AddDomainForm onCancel={() => setAdding(false)} onAdd={(name, color) => { setAdding(false); start(() => createDomain(name, color)); }} />
      ) : (
        <button onClick={() => setAdding(true)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-secondary">
          <Plus className="h-4 w-4" /> Domain
        </button>
      )}
    </DndContext>
  );
}

function Band({ dom, onLocalReorder }: { dom: Dom; onLocalReorder: (ids: string[]) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: dom.id });
  const [, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(dom.name);
  const [addIni, setAddIni] = useState(false);
  const [iniTitle, setIniTitle] = useState("");

  const cardSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onCardDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = dom.initiatives.map((i) => i.id);
    const oldI = ids.indexOf(active.id as string);
    const newI = ids.indexOf(over.id as string);
    if (oldI < 0 || newI < 0) return;
    onLocalReorder(arrayMove(ids, oldI, newI));
  }

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("overflow-hidden rounded-xl border bg-white", isDragging && "opacity-60 shadow-lg")}>
      <div className="flex items-center gap-3 border-l-4 px-3 py-3" style={{ borderColor: dom.color }}>
        <button ref={setActivatorNodeRef} {...attributes} {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" aria-label="Reorder domain">
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={() => start(() => toggleDomainCollapse(dom.id, !dom.collapsed))} className="text-muted-foreground">
          {dom.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <HealthDot health={dom.health} />
        {editing ? (
          <span className="flex items-center gap-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 w-44" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); start(() => renameDomain(dom.id, name.trim() || dom.name)); } }} />
            <button onClick={() => { setEditing(false); start(() => renameDomain(dom.id, name.trim() || dom.name)); }} className="text-health-green"><Check className="h-4 w-4" /></button>
            <button onClick={() => { setEditing(false); setName(dom.name); }} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </span>
        ) : (
          <span className="font-medium text-even-navy">{dom.name}</span>
        )}
        <span className="text-xs text-muted-foreground">{dom.initiatives.length} initiatives</span>
        <div className="ml-auto flex items-center gap-3">
          <AvatarStack people={dom.guides} />
          <div className="flex items-center gap-1">
            {SWATCHES.slice(0, 6).map((c) => (
              <button key={c} onClick={() => start(() => recolorDomain(dom.id, c))}
                className={cn("h-3.5 w-3.5 rounded-full ring-1 ring-black/10", dom.color === c && "ring-2 ring-offset-1 ring-black/40")}
                style={{ backgroundColor: c }} aria-label={`Recolor ${c}`} />
            ))}
          </div>
          <button onClick={() => setEditing((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label="Rename"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => { if (confirm(`Archive “${dom.name}”? Its initiatives are kept.`)) start(() => archiveDomain(dom.id)); }}
            className="text-muted-foreground hover:text-destructive" aria-label="Archive"><Archive className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!dom.collapsed && (
        <div className="p-4">
          <DndContext sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={onCardDragEnd}>
            <SortableContext items={dom.initiatives.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-3">
                {dom.initiatives.map((i) => <Card key={i.id} ini={i} />)}
                {addIni ? (
                  <form className="flex w-48 items-center gap-1"
                    onSubmit={(e) => { e.preventDefault(); const t = iniTitle.trim(); if (t) start(() => createInitiative(dom.id, t)); setIniTitle(""); setAddIni(false); }}>
                    <Input value={iniTitle} onChange={(e) => setIniTitle(e.target.value)} placeholder="New initiative" autoFocus className="h-9" />
                  </form>
                ) : (
                  <button onClick={() => setAddIni(true)}
                    className="flex w-32 items-center justify-center gap-1 rounded-xl border border-dashed py-4 text-xs text-muted-foreground hover:bg-secondary">
                    <Plus className="h-3.5 w-3.5" /> Initiative
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function Card({ ini }: { ini: Ini }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ini.id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("w-48 rounded-xl border bg-white shadow-sm", isDragging && "opacity-60 shadow-lg")}
      {...attributes} {...listeners}>
      <Link href={`/n/initiative/${ini.id}`} className="block p-4" draggable={false}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-snug text-even-navy">{ini.title}</span>
          <HealthDot health={ini.health} className="mt-1 shrink-0" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {ini.gtdStatus === "someday" && <span className="rounded bg-secondary px-1.5 py-0.5">someday</span>}
          {ini.actionCount > 0 && <span>{ini.actionCount} action{ini.actionCount > 1 ? "s" : ""}</span>}
          {ini.goalTitle && <span className="inline-flex max-w-full items-center gap-0.5 truncate rounded bg-primary/10 px-1.5 py-0.5 text-primary" title={ini.goalTitle}>\u25CE {ini.goalTitle}</span>}
        </div>
      </Link>
    </div>
  );
}

function AddDomainForm({ onAdd, onCancel }: { onAdd: (n: string, c: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  return (
    <form className="mt-4 flex items-center gap-3 rounded-xl border p-3"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onAdd(name.trim(), color); }}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Domain name" autoFocus className="w-56" />
      <div className="flex items-center gap-1">
        {SWATCHES.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className={cn("h-4 w-4 rounded-full ring-1 ring-black/10", color === c && "ring-2 ring-offset-1 ring-black/40")}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Add</button>
      <button type="button" onClick={onCancel} className="text-sm text-muted-foreground">Cancel</button>
    </form>
  );
}
