import "server-only";
import { getBoard } from "@/lib/queries";
import { getEnrichedTasks } from "@/lib/gtd";
import { getGoals } from "@/lib/strategy";

/** Compact, structured snapshot of the board for AI context (no raw dumps). */
export async function getBoardSnapshot() {
  const [board, tasks, goals] = await Promise.all([getBoard(), getEnrichedTasks(), getGoals()]);
  const domains = board.map((d) => ({
    domain: d.name,
    guides: d.guides.map((g) => g.name),
    initiatives: d.initiatives.map((i) => ({ id: i.id, title: i.title, status: i.gtdStatus, goal: i.goalTitle || undefined })),
  }));
  const activeTasks = tasks.filter((t) => t.gtdStatus !== "done").map((t) => ({
    id: t.id, title: t.title, status: t.gtdStatus, contexts: t.contexts,
    initiative: t.path.initiative?.title, assignee: t.assignee?.name,
    waitingOn: t.waitingOn ? `${t.waitingOn.name} (${t.waitingDays ?? 0}d)` : undefined,
    blocked: t.blocked ? t.blockers.map((b) => b.label) : undefined,
  }));
  const goalList = goals.map((g) => ({
    id: g.id, title: g.title, status: g.status, horizon: g.targetHorizon || undefined,
    diagnosis: g.diagnosis || undefined, principles: g.guidingPrinciples,
    coherentActions: g.coherentCount, unlinkedActions: g.unlinkedActions,
    linkedInitiatives: g.linkedInitiativeCount, strategyWithoutExecution: g.strategyWithoutExecution,
  }));
  return { domains, tasks: activeTasks, goals: goalList };
}

export type Snapshot = Awaited<ReturnType<typeof getBoardSnapshot>>;
