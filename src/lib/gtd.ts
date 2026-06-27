import "server-only";
import { db } from "@/db";
import {
  tasks, actions, initiatives, domains, people, dependencies, inboxItems, activityLog,
} from "@/db/schema";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";

export type Person = typeof people.$inferSelect;

export type EnrichedTask = {
  id: string; title: string; notes: string | null;
  gtdStatus: string; isNextAction: boolean; contexts: string[];
  energy: string | null; priority: number | null;
  dueDate: Date | null; deferUntil: Date | null;
  completedAt: Date | null; completionNote: string | null;
  actionId: string | null; initiativeId: string | null;
  assignee: { id: string; name: string; color: string } | null;
  waitingOn: { id: string; name: string; color: string } | null;
  waitingDays: number | null;
  path: { domain?: { name: string; color: string }; initiative?: { id: string; title: string } };
  blockers: { id: string; label: string }[];
  blocked: boolean;
};

function days(since: Date | null): number | null {
  if (!since) return null;
  return Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
}

export async function getEnrichedTasks(): Promise<EnrichedTask[]> {
  const [ts, acts, inis, doms, ppl, deps] = await Promise.all([
    db.select().from(tasks).where(ne(tasks.gtdStatus, "dropped")).orderBy(asc(tasks.sortOrder)),
    db.select().from(actions),
    db.select().from(initiatives),
    db.select().from(domains),
    db.select().from(people),
    db.select().from(dependencies).where(eq(dependencies.state, "active")),
  ]);
  const actById = new Map(acts.map((a) => [a.id, a]));
  const iniById = new Map(inis.map((i) => [i.id, i]));
  const domById = new Map(doms.map((d) => [d.id, d]));
  const perById = new Map(ppl.map((p) => [p.id, p]));
  const blockersByTask = new Map<string, { id: string; label: string }[]>();
  for (const d of deps) {
    if (d.dependentNodeType !== "task") continue;
    let label = d.externalLabel || "blocker";
    if (d.blockerNodeType === "task") label = ts.find((t) => t.id === d.blockerNodeId)?.title || label;
    else if (d.blockerNodeType === "initiative") label = iniById.get(d.blockerNodeId!)?.title || label;
    const arr = blockersByTask.get(d.dependentNodeId) || [];
    arr.push({ id: d.id, label }); blockersByTask.set(d.dependentNodeId, arr);
  }
  const per = (id: string | null) => {
    if (!id) return null; const p = perById.get(id);
    return p ? { id: p.id, name: p.name, color: p.avatarColor } : null;
  };
  return ts.map((t) => {
    let ini = t.initiativeId ? iniById.get(t.initiativeId) : undefined;
    if (!ini && t.actionId) { const a = actById.get(t.actionId); if (a) ini = iniById.get(a.initiativeId); }
    const dom = ini ? domById.get(ini.domainId) : undefined;
    const blockers = blockersByTask.get(t.id) || [];
    return {
      id: t.id, title: t.title, notes: t.notes,
      gtdStatus: t.gtdStatus, isNextAction: t.isNextAction, contexts: t.contexts || [],
      energy: t.energy, priority: t.priority, dueDate: t.dueDate, deferUntil: t.deferUntil,
      completedAt: t.completedAt, completionNote: t.completionNote,
      actionId: t.actionId, initiativeId: t.initiativeId,
      assignee: per(t.assigneePersonId), waitingOn: per(t.waitingOnPersonId),
      waitingDays: days(t.waitingSince),
      path: { domain: dom ? { name: dom.name, color: dom.color } : undefined, initiative: ini ? { id: ini.id, title: ini.title } : undefined },
      blockers, blocked: blockers.length > 0,
    };
  });
}

export type Bucket = { next: EnrichedTask[]; waiting: EnrichedTask[]; blocked: EnrichedTask[]; tickler: EnrichedTask[]; scheduled: EnrichedTask[]; someday: EnrichedTask[]; done: EnrichedTask[] };
export function bucketize(all: EnrichedTask[]): Bucket {
  const now = Date.now();
  const isTickler = (t: EnrichedTask) => t.deferUntil && new Date(t.deferUntil).getTime() <= now;
  const active = all.filter((t) => t.gtdStatus !== "done");
  return {
    next: active.filter((t) => t.gtdStatus === "next" && !t.blocked),
    waiting: active.filter((t) => t.gtdStatus === "waiting"),
    blocked: active.filter((t) => t.blocked),
    tickler: active.filter((t) => isTickler(t)),
    scheduled: active.filter((t) => t.gtdStatus === "scheduled" || t.deferUntil),
    someday: active.filter((t) => t.gtdStatus === "someday"),
    done: all.filter((t) => t.gtdStatus === "done"),
  };
}

export async function getInbox() {
  return db.select().from(inboxItems).where(isNull(inboxItems.processedAt)).orderBy(desc(inboxItems.createdAt));
}

export async function getClarifyTargets() {
  const [inis, ppl] = await Promise.all([
    db.select({ id: initiatives.id, title: initiatives.title, domainId: initiatives.domainId })
      .from(initiatives).where(isNull(initiatives.archivedAt)).orderBy(asc(initiatives.sortOrder)),
    db.select().from(people).where(isNull(people.archivedAt)).orderBy(asc(people.name)),
  ]);
  return { initiatives: inis, people: ppl };
}

export async function getPeopleFollowups() {
  const all = await getEnrichedTasks();
  const ppl = await db.select().from(people).where(isNull(people.archivedAt)).orderBy(asc(people.name));
  return ppl.map((p) => ({
    person: p,
    waitingOn: all.filter((t) => t.waitingOn?.id === p.id && t.gtdStatus === "waiting"),
    assigned: all.filter((t) => t.assignee?.id === p.id && t.gtdStatus !== "done"),
  }));
}

export async function getTaskDetail(id: string) {
  const [t] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!t) return null;
  const [ppl, deps, log] = await Promise.all([
    db.select().from(people).where(isNull(people.archivedAt)).orderBy(asc(people.name)),
    db.select().from(dependencies).where(and(eq(dependencies.dependentNodeType, "task"), eq(dependencies.dependentNodeId, id))).orderBy(desc(dependencies.createdAt)),
    db.select().from(activityLog).where(and(eq(activityLog.nodeType, "task"), eq(activityLog.nodeId, id))).orderBy(desc(activityLog.at)),
  ]);
  return { task: t, people: ppl, dependencies: deps, log };
}

export async function getRoster() {
  return db.select().from(people).where(isNull(people.archivedAt)).orderBy(asc(people.name));
}
