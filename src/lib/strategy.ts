import "server-only";
import { db } from "@/db";
import { goals, strategyKernels, kernelActions, initiatives } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

export type GoalStatus = "not_started" | "active" | "at_risk" | "done" | "dropped";

export async function getGoals() {
  const [gs, kernels, kActions, inis] = await Promise.all([
    db.select().from(goals).where(isNull(goals.archivedAt)).orderBy(asc(goals.sortOrder)),
    db.select().from(strategyKernels),
    db.select().from(kernelActions).orderBy(asc(kernelActions.sortOrder)),
    db.select({ id: initiatives.id, goalId: initiatives.goalId, title: initiatives.title }).from(initiatives).where(isNull(initiatives.archivedAt)),
  ]);
  const kernelByGoal = new Map(kernels.map((k) => [k.goalId, k]));
  const actionsByKernel = new Map<string, typeof kActions>();
  for (const a of kActions) { const arr = actionsByKernel.get(a.kernelId) || []; arr.push(a); actionsByKernel.set(a.kernelId, arr); }

  return gs.map((g) => {
    const kernel = kernelByGoal.get(g.id);
    const coherent = kernel ? (actionsByKernel.get(kernel.id) || []) : [];
    const linkedInitiatives = inis.filter((i) => i.goalId === g.id);
    const hasKernel = !!kernel;
    const unlinkedActions = coherent.filter((a) => !a.linkedNodeId).length;
    // "strategy without execution": coherent actions exist but some don't link to a real node,
    // or the goal has no linked initiatives at all.
    const strategyWithoutExecution = hasKernel && coherent.length > 0 && unlinkedActions > 0;
    return {
      id: g.id, title: g.title, status: g.status as GoalStatus, targetHorizon: g.targetHorizon,
      diagnosis: kernel?.diagnosis ?? null,
      guidingPrinciples: (kernel?.guidingPrinciples as string[]) ?? [],
      coherentCount: coherent.length, unlinkedActions,
      linkedInitiativeCount: linkedInitiatives.length,
      hasKernel, strategyWithoutExecution,
    };
  });
}
export type GoalCard = Awaited<ReturnType<typeof getGoals>>[number];

export async function getGoalDetail(id: string) {
  const [g] = await db.select().from(goals).where(eq(goals.id, id));
  if (!g) return null;
  let [kernel] = await db.select().from(strategyKernels).where(eq(strategyKernels.goalId, id));
  if (!kernel) {
    [kernel] = await db.insert(strategyKernels).values({ goalId: id, guidingPrinciples: [] }).returning();
  }
  const [coherent, linkedInitiatives, allInitiatives] = await Promise.all([
    db.select().from(kernelActions).where(eq(kernelActions.kernelId, kernel.id)).orderBy(asc(kernelActions.sortOrder)),
    db.select({ id: initiatives.id, title: initiatives.title }).from(initiatives).where(and(eq(initiatives.goalId, id), isNull(initiatives.archivedAt))).orderBy(asc(initiatives.title)),
    db.select({ id: initiatives.id, title: initiatives.title, goalId: initiatives.goalId }).from(initiatives).where(isNull(initiatives.archivedAt)).orderBy(asc(initiatives.title)),
  ]);
  const iniTitle = new Map(allInitiatives.map((i) => [i.id, i.title]));
  return {
    goal: g,
    kernel,
    coherent: coherent.map((c) => ({
      id: c.id, text: c.text, linkedNodeType: c.linkedNodeType, linkedNodeId: c.linkedNodeId,
      linkedTitle: c.linkedNodeId ? (iniTitle.get(c.linkedNodeId) || null) : null,
    })),
    linkedInitiatives,
    allInitiatives,
    guidingPrinciples: (kernel.guidingPrinciples as string[]) ?? [],
  };
}

/** Lightweight node index for the ⌘K palette. */
export async function getCommandIndex() {
  const [gs, inis, gAll] = await Promise.all([
    db.select({ id: goals.id, title: goals.title }).from(goals).where(isNull(goals.archivedAt)),
    db.select({ id: initiatives.id, title: initiatives.title }).from(initiatives).where(isNull(initiatives.archivedAt)),
    db.select({ id: goals.id }).from(goals).where(isNull(goals.archivedAt)),
  ]);
  return [
    ...gs.map((g) => ({ type: "goal", id: g.id, title: g.title, href: `/n/goal/${g.id}` })),
    ...inis.map((i) => ({ type: "initiative", id: i.id, title: i.title, href: `/n/initiative/${i.id}` })),
  ];
}
