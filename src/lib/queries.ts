import "server-only";
import { db } from "@/db";
import { domains, initiatives, actions, people, tasks, goals } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

export type Health = "green" | "amber" | "red";

export async function getBoard() {
  const [ds, allPeople, inis, allActions, allGoals] = await Promise.all([
    db.select().from(domains).where(isNull(domains.archivedAt)).orderBy(asc(domains.sortOrder)),
    db.select().from(people),
    db.select().from(initiatives).where(isNull(initiatives.archivedAt)).orderBy(asc(initiatives.sortOrder)),
    db.select({ initiativeId: actions.initiativeId, gtdStatus: actions.gtdStatus })
      .from(actions).where(isNull(actions.archivedAt)),
    db.select({ id: goals.id, title: goals.title }).from(goals).where(isNull(goals.archivedAt)),
  ]);
  const goalTitleById = new Map(allGoals.map((g) => [g.id, g.title]));

  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const actCount = new Map<string, number>();
  for (const a of allActions) actCount.set(a.initiativeId, (actCount.get(a.initiativeId) || 0) + 1);

  const inisByDomain = new Map<string, typeof inis>();
  for (const i of inis) {
    const arr = inisByDomain.get(i.domainId) || [];
    arr.push(i); inisByDomain.set(i.domainId, arr);
  }

  return ds.map((d) => {
    const dInis = (inisByDomain.get(d.id) || []).map((i) => ({
      id: i.id,
      title: i.title,
      gtdStatus: i.gtdStatus,
      goalId: i.goalId,
      goalTitle: i.goalId ? (goalTitleById.get(i.goalId) || null) : null,
      actionCount: actCount.get(i.id) || 0,
      health: (i.gtdStatus === "someday" ? "amber" : "green") as Health,
    }));
    const health: Health = dInis.some((i) => i.health === "red")
      ? "red" : dInis.some((i) => i.health === "amber") ? "amber" : "green";
    return {
      id: d.id,
      name: d.name,
      color: d.color,
      collapsed: d.collapsed,
      guides: (d.guidePersonIds || [])
        .map((id) => personById.get(id))
        .filter(Boolean)
        .map((p) => ({ id: p!.id, name: p!.name, color: p!.avatarColor })),
      initiatives: dInis,
      health,
    };
  });
}
export type Board = Awaited<ReturnType<typeof getBoard>>;

export async function getInitiative(id: string) {
  const [ini] = await db.select().from(initiatives).where(eq(initiatives.id, id));
  if (!ini) return null;
  const [dom] = await db.select().from(domains).where(eq(domains.id, ini.domainId));
  const acts = await db.select().from(actions)
    .where(and(eq(actions.initiativeId, id), isNull(actions.archivedAt)))
    .orderBy(asc(actions.sortOrder));
  return { initiative: ini, domain: dom, actions: acts };
}

export async function getAction(id: string) {
  const [act] = await db.select().from(actions).where(eq(actions.id, id));
  if (!act) return null;
  const [ini] = await db.select().from(initiatives).where(eq(initiatives.id, act.initiativeId));
  const ts = await db.select().from(tasks)
    .where(eq(tasks.actionId, id)).orderBy(asc(tasks.sortOrder));
  return { action: act, initiative: ini, tasks: ts };
}
