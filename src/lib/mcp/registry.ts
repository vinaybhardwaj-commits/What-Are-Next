import "server-only";
import { db } from "@/db";
import { strategyKernels, kernelActions } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { getBoard, getInitiative } from "@/lib/queries";
import { getGoals, getGoalDetail } from "@/lib/strategy";
import { getEnrichedTasks, getRoster, getContexts, getInbox, getTaskDetail } from "@/lib/gtd";
import {
  createDomain, renameDomain, recolorDomain, archiveDomain,
  createGoal, updateGoal, archiveGoal, setGoalDomains,
  saveDiagnosis, setGuidingPrinciples, addCoherentAction, linkCoherentAction, removeCoherentAction,
  createInitiative, archiveInitiative, setInitiativeGoals, setInitiativeStatus, setInitiativeDomain, updateNotes,
  createAction, archiveAction, setActionStatus,
  addTaskToList, createTask, setGtdStatus, setContexts, setPriority, setDue, setDefer,
  setAssignee, setWaitingOn, completeTask, reopenTask, dropTask, renameNode,
  createPerson, updatePerson, archivePerson, addContext, removeContext,
  captureInbox, clarifyToTask, clarifyDrop,
} from "@/lib/actions";

type Tool = { name: string; description: string; inputSchema: any; handler: (a: any) => Promise<any> };

const str = (d: string) => ({ type: "string", description: d });
const obj = (props: any, required: string[] = []) => ({ type: "object", properties: props, required, additionalProperties: false });

async function kernelIdFor(goalId: string): Promise<string | null> {
  const [k] = await db.select({ id: strategyKernels.id }).from(strategyKernels).where(eq(strategyKernels.goalId, goalId));
  return k?.id ?? null;
}

export const TOOLS: Tool[] = [
  /* ───────────────── READ ───────────────── */
  {
    name: "wan_overview",
    description: "Full board snapshot: domains → initiatives (with their strategies, action counts, status), the list of goals/strategies, people, contexts, and inbox count. Call this first to get oriented and to collect IDs for other tools.",
    inputSchema: obj({}),
    handler: async () => {
      const [board, goals, roster, contexts, inbox] = await Promise.all([getBoard(), getGoals(), getRoster(), getContexts(), getInbox()]);
      return {
        domains: board.map((d) => ({
          id: d.id, name: d.name, color: d.color,
          initiatives: d.initiatives.map((i) => ({ id: i.id, title: i.title, status: i.gtdStatus, actions: i.actionCount, strategies: i.goalTitles })),
        })),
        goals: goals.map((g) => ({ id: g.id, title: g.title, status: g.status, horizon: g.targetHorizon, coherentActions: g.coherentCount, linkedInitiatives: g.linkedInitiativeCount, domains: g.domains.map((x) => x.name), strategyWithoutExecution: g.strategyWithoutExecution })),
        people: roster.map((p) => ({ id: p.id, name: p.name, role: p.role })),
        contexts,
        inboxCount: inbox.length,
      };
    },
  },
  {
    name: "list_tasks",
    description: "List to-dos with optional filters. By default excludes completed/dropped. Returns id, title, status, contexts, initiative, assignee, waiting-on, blocked, due date.",
    inputSchema: obj({
      status: str("filter by GTD status: inbox|next|waiting|scheduled|someday|done|dropped"),
      context: str("filter by an @context"),
      initiativeId: str("filter to one initiative"),
      includeDone: { type: "boolean", description: "include done/dropped (default false)" },
      waitingOnly: { type: "boolean", description: "only tasks delegated/waiting-on someone" },
    }),
    handler: async (a) => {
      let ts = await getEnrichedTasks();
      if (!a.includeDone) ts = ts.filter((t) => t.gtdStatus !== "done" && t.gtdStatus !== "dropped");
      if (a.status) ts = ts.filter((t) => t.gtdStatus === a.status);
      if (a.context) ts = ts.filter((t) => t.contexts.includes(a.context));
      if (a.initiativeId) ts = ts.filter((t) => t.initiativeId === a.initiativeId);
      if (a.waitingOnly) ts = ts.filter((t) => !!t.waitingOn);
      return ts.map((t) => ({
        id: t.id, title: t.title, status: t.gtdStatus, contexts: t.contexts,
        initiative: t.path.initiative?.title ?? null, initiativeId: t.initiativeId,
        assignee: t.assignee?.name ?? null, waitingOn: t.waitingOn ? `${t.waitingOn.name} (${t.waitingDays ?? 0}d)` : null,
        blocked: t.blocked, due: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null, priority: t.priority,
      }));
    },
  },
  {
    name: "get_goal",
    description: "Full detail of one strategy/goal: kernel (diagnosis, guiding principles), coherent actions and what each links to, linked initiatives, and tagged domains.",
    inputSchema: obj({ goalId: str("the goal id") }, ["goalId"]),
    handler: async (a) => {
      const d = await getGoalDetail(a.goalId);
      if (!d) return { error: "goal not found" };
      return {
        id: d.goal.id, title: d.goal.title, status: d.goal.status, horizon: d.goal.targetHorizon,
        domains: d.allDomains.filter((x) => d.domainIds.includes(x.id)).map((x) => x.name),
        diagnosis: d.kernel.diagnosis, guidingPrinciples: d.guidingPrinciples,
        coherentActions: d.coherent.map((c) => ({ id: c.id, text: c.text, linkedInitiative: c.linkedTitle, linkedInitiativeId: c.linkedNodeId })),
        linkedInitiatives: d.linkedInitiatives,
      };
    },
  },
  {
    name: "get_initiative",
    description: "Full detail of one initiative: domain, the strategies it serves (goalIds), notes, gtd status, and its actions.",
    inputSchema: obj({ initiativeId: str("the initiative id") }, ["initiativeId"]),
    handler: async (a) => {
      const d = await getInitiative(a.initiativeId);
      if (!d) return { error: "initiative not found" };
      return {
        id: d.initiative.id, title: d.initiative.title, notes: d.initiative.notes,
        domainId: d.initiative.domainId, domain: d.domain?.name ?? null, status: d.initiative.gtdStatus,
        goalIds: (d.initiative.goalIds as string[]) || [],
        actions: d.actions.map((x) => ({ id: x.id, title: x.title, status: x.gtdStatus, sequence: x.sequence })),
      };
    },
  },
  {
    name: "get_task",
    description: "Full detail of one task including its activity log and blockers.",
    inputSchema: obj({ taskId: str("the task id") }, ["taskId"]),
    handler: async (a) => {
      const d = await getTaskDetail(a.taskId);
      if (!d) return { error: "task not found" };
      return { task: d.task, blockers: d.dependencies, log: d.log.slice(0, 20) };
    },
  },
  { name: "list_people", description: "List people on the roster (id, name, role).", inputSchema: obj({}), handler: async () => (await getRoster()).map((p) => ({ id: p.id, name: p.name, role: p.role, team: p.team })) },
  { name: "list_inbox", description: "List unprocessed inbox items (stray captures awaiting clarification).", inputSchema: obj({}), handler: async () => (await getInbox()).map((i) => ({ id: i.id, text: i.rawText })) },

  /* ───────────────── DOMAINS ───────────────── */
  { name: "create_domain", description: "Create a new domain (top-level category).", inputSchema: obj({ name: str("domain name"), color: str("hex color, optional") }, ["name"]), handler: async (a) => ({ id: await createDomain(a.name, a.color || "#2A6DFF") }) },
  { name: "update_domain", description: "Rename and/or recolor a domain.", inputSchema: obj({ id: str("domain id"), name: str("new name"), color: str("new hex color") }, ["id"]), handler: async (a) => { if (a.name) await renameDomain(a.id, a.name); if (a.color) await recolorDomain(a.id, a.color); return { ok: true }; } },
  { name: "archive_domain", description: "Archive (soft-delete) a domain.", inputSchema: obj({ id: str("domain id") }, ["id"]), handler: async (a) => { await archiveDomain(a.id); return { ok: true }; } },

  /* ───────────────── GOALS / STRATEGIES ───────────────── */
  { name: "create_goal", description: "Create a strategy/goal (a Rumelt kernel is created with it).", inputSchema: obj({ title: str("goal title"), targetHorizon: str("e.g. 'Q3 2026'"), domainIds: { type: "array", items: { type: "string" }, description: "domain ids this goal serves" } }, ["title"]), handler: async (a) => { const id = await createGoal(a.title); if (!id) return { error: "empty title" }; if (a.targetHorizon) await updateGoal(id, { targetHorizon: a.targetHorizon }); if (a.domainIds) await setGoalDomains(id, a.domainIds); return { id }; } },
  { name: "update_goal", description: "Update a goal's title, status, target horizon, and/or domain tags.", inputSchema: obj({ id: str("goal id"), title: str("new title"), status: str("not_started|active|at_risk|done|dropped"), targetHorizon: str("e.g. 'Q3 2026'"), domainIds: { type: "array", items: { type: "string" } } }, ["id"]), handler: async (a) => { const patch: any = {}; if (a.title) patch.title = a.title; if (a.status) patch.status = a.status; if (a.targetHorizon !== undefined) patch.targetHorizon = a.targetHorizon; if (Object.keys(patch).length) await updateGoal(a.id, patch); if (a.domainIds) await setGoalDomains(a.id, a.domainIds); return { ok: true }; } },
  { name: "archive_goal", description: "Archive (soft-delete) a goal.", inputSchema: obj({ id: str("goal id") }, ["id"]), handler: async (a) => { await archiveGoal(a.id); return { ok: true }; } },
  { name: "update_kernel", description: "Update a goal's Rumelt kernel: diagnosis and/or the full list of guiding principles.", inputSchema: obj({ goalId: str("goal id"), diagnosis: str("the crux / what's going on"), guidingPrinciples: { type: "array", items: { type: "string" }, description: "FULL replacement list of guiding principles" } }, ["goalId"]), handler: async (a) => { const kid = await kernelIdFor(a.goalId); if (!kid) return { error: "no kernel" }; if (a.diagnosis !== undefined) await saveDiagnosis(kid, a.goalId, a.diagnosis); if (a.guidingPrinciples) await setGuidingPrinciples(kid, a.goalId, a.guidingPrinciples); return { ok: true }; } },
  { name: "add_coherent_action", description: "Add a coherent action to a goal's kernel; optionally link it to an initiative (which also tags that initiative as serving this goal).", inputSchema: obj({ goalId: str("goal id"), text: str("the coherent action"), linkInitiativeId: str("initiative id to link, optional") }, ["goalId", "text"]), handler: async (a) => { const kid = await kernelIdFor(a.goalId); if (!kid) return { error: "no kernel" }; await addCoherentAction(kid, a.goalId, a.text); const [latest] = await db.select({ id: kernelActions.id }).from(kernelActions).where(eq(kernelActions.kernelId, kid)).orderBy(desc(kernelActions.sortOrder)); if (a.linkInitiativeId && latest) await linkCoherentAction(latest.id, a.goalId, a.linkInitiativeId); return { id: latest?.id }; } },
  { name: "link_coherent_action", description: "Link (or unlink) a coherent action to an initiative. Linking also tags that initiative as serving the goal.", inputSchema: obj({ coherentActionId: str("coherent action id"), goalId: str("goal id"), initiativeId: str("initiative id, or omit/null to unlink") }, ["coherentActionId", "goalId"]), handler: async (a) => { await linkCoherentAction(a.coherentActionId, a.goalId, a.initiativeId ?? null); return { ok: true }; } },
  { name: "remove_coherent_action", description: "Remove a coherent action from a goal's kernel.", inputSchema: obj({ coherentActionId: str("coherent action id"), goalId: str("goal id") }, ["coherentActionId", "goalId"]), handler: async (a) => { await removeCoherentAction(a.coherentActionId, a.goalId); return { ok: true }; } },

  /* ───────────────── INITIATIVES ───────────────── */
  { name: "create_initiative", description: "Create an initiative inside a domain; optionally set the strategies it serves.", inputSchema: obj({ domainId: str("domain id"), title: str("initiative title"), goalIds: { type: "array", items: { type: "string" }, description: "strategy/goal ids it serves" }, someday: { type: "boolean", description: "mark as someday/wishlist" } }, ["domainId", "title"]), handler: async (a) => { const id = await createInitiative(a.domainId, a.title); if (a.goalIds) await setInitiativeGoals(id, a.goalIds); if (a.someday) await setInitiativeStatus(id, "someday"); return { id }; } },
  { name: "update_initiative", description: "Update an initiative: title, notes, domain, the strategies it serves (goalIds), and/or status (next|someday).", inputSchema: obj({ id: str("initiative id"), title: str("new title"), notes: str("markdown notes (replaces)"), domainId: str("move to this domain"), goalIds: { type: "array", items: { type: "string" }, description: "FULL replacement set of strategy ids" }, status: str("next|someday") }, ["id"]), handler: async (a) => { if (a.title) await renameNode("initiative", a.id, a.title); if (a.notes !== undefined) await updateNotes("initiative", a.id, a.notes); if (a.domainId) await setInitiativeDomain(a.id, a.domainId); if (a.goalIds) await setInitiativeGoals(a.id, a.goalIds); if (a.status) await setInitiativeStatus(a.id, a.status); return { ok: true }; } },
  { name: "archive_initiative", description: "Archive (soft-delete) an initiative.", inputSchema: obj({ id: str("initiative id") }, ["id"]), handler: async (a) => { await archiveInitiative(a.id); return { ok: true }; } },

  /* ───────────────── ACTIONS ───────────────── */
  { name: "create_action", description: "Create an action under an initiative.", inputSchema: obj({ initiativeId: str("initiative id"), title: str("action title") }, ["initiativeId", "title"]), handler: async (a) => ({ id: await createAction(a.initiativeId, a.title) }) },
  { name: "update_action", description: "Update an action's title and/or status (next|someday).", inputSchema: obj({ id: str("action id"), title: str("new title"), status: str("next|someday") }, ["id"]), handler: async (a) => { if (a.title) await renameNode("action", a.id, a.title); if (a.status) await setActionStatus(a.id, a.status); return { ok: true }; } },
  { name: "archive_action", description: "Archive (soft-delete) an action.", inputSchema: obj({ id: str("action id") }, ["id"]), handler: async (a) => { await archiveAction(a.id); return { ok: true }; } },

  /* ───────────────── TASKS / TODOS ───────────────── */
  {
    name: "create_task",
    description: "Create a to-do. Provide actionId to nest it under an action, or initiativeId to attach to an initiative, or neither for a standalone next-action. Optional context/due/priority/people.",
    inputSchema: obj({
      title: str("task title"), actionId: str("parent action id, optional"), initiativeId: str("attach to initiative, optional"),
      status: str("next|someday (default next)"), contexts: { type: "array", items: { type: "string" } }, dueDate: str("YYYY-MM-DD"),
      priority: { type: "number" }, assigneePersonId: str("person id"), waitingOnPersonId: str("person id"),
    }, ["title"]),
    handler: async (a) => {
      let id: string | undefined;
      if (a.actionId) id = await createTask(a.actionId, a.title);
      else id = await addTaskToList(a.title, a.status === "someday" ? "someday" : "next", a.contexts || [], a.initiativeId ?? null);
      if (!id) return { error: "could not create" };
      if (a.actionId && a.contexts) await setContexts(id, a.contexts);
      if (a.dueDate) await setDue(id, a.dueDate);
      if (a.priority != null) await setPriority(id, a.priority);
      if (a.assigneePersonId) await setAssignee(id, a.assigneePersonId);
      if (a.waitingOnPersonId) await setWaitingOn(id, a.waitingOnPersonId);
      return { id };
    },
  },
  {
    name: "update_task",
    description: "Update a to-do: title, status, contexts, due/defer dates, priority, assignee, or waiting-on.",
    inputSchema: obj({
      id: str("task id"), title: str("new title"), status: str("inbox|next|waiting|scheduled|someday|done|dropped"),
      contexts: { type: "array", items: { type: "string" }, description: "FULL replacement list" }, dueDate: str("YYYY-MM-DD or null"),
      deferUntil: str("YYYY-MM-DD or null"), priority: { type: "number" }, assigneePersonId: str("person id or null"), waitingOnPersonId: str("person id or null"),
    }, ["id"]),
    handler: async (a) => {
      if (a.title) await renameNode("task", a.id, a.title);
      if (a.status) await setGtdStatus(a.id, a.status);
      if (a.contexts) await setContexts(a.id, a.contexts);
      if (a.dueDate !== undefined) await setDue(a.id, a.dueDate);
      if (a.deferUntil !== undefined) await setDefer(a.id, a.deferUntil);
      if (a.priority !== undefined) await setPriority(a.id, a.priority);
      if (a.assigneePersonId !== undefined) await setAssignee(a.id, a.assigneePersonId);
      if (a.waitingOnPersonId !== undefined) await setWaitingOn(a.id, a.waitingOnPersonId);
      return { ok: true };
    },
  },
  { name: "complete_task", description: "Mark a to-do done, with an optional completion note.", inputSchema: obj({ id: str("task id"), note: str("completion note, optional") }, ["id"]), handler: async (a) => { await completeTask(a.id, a.note); return { ok: true }; } },
  { name: "reopen_task", description: "Reopen a completed to-do.", inputSchema: obj({ id: str("task id") }, ["id"]), handler: async (a) => { await reopenTask(a.id); return { ok: true }; } },
  { name: "archive_task", description: "Archive a to-do (drops it; reversible with reopen_task).", inputSchema: obj({ id: str("task id") }, ["id"]), handler: async (a) => { await dropTask(a.id); return { ok: true }; } },

  /* ───────────────── PEOPLE ───────────────── */
  { name: "create_person", description: "Add a person to the roster.", inputSchema: obj({ name: str("full name"), role: str("role, optional") }, ["name"]), handler: async (a) => ({ id: await createPerson(a.name, a.role) }) },
  { name: "update_person", description: "Update a person's name and/or role.", inputSchema: obj({ id: str("person id"), name: str("new name"), role: str("new role") }, ["id"]), handler: async (a) => { const patch: any = {}; if (a.name) patch.name = a.name; if (a.role !== undefined) patch.role = a.role; await updatePerson(a.id, patch); return { ok: true }; } },
  { name: "archive_person", description: "Archive (soft-delete) a person.", inputSchema: obj({ id: str("person id") }, ["id"]), handler: async (a) => { await archivePerson(a.id); return { ok: true }; } },

  /* ───────────────── CONTEXTS ───────────────── */
  { name: "add_context", description: "Add an @context to the registry.", inputSchema: obj({ name: str("context, e.g. @clinic") }, ["name"]), handler: async (a) => { await addContext(a.name); return { ok: true }; } },
  { name: "remove_context", description: "Remove an @context from the registry.", inputSchema: obj({ name: str("context to remove") }, ["name"]), handler: async (a) => { await removeContext(a.name); return { ok: true }; } },

  /* ───────────────── INBOX / GTD CAPTURE ───────────────── */
  { name: "capture", description: "Capture a stray thought / to-do into the Inbox for later clarification.", inputSchema: obj({ text: str("the thought") }, ["text"]), handler: async (a) => { await captureInbox(a.text); return { ok: true }; } },
  {
    name: "clarify_inbox",
    description: "Process an inbox item: turn it into a task, file as someday/reference, or drop it.",
    inputSchema: obj({
      inboxId: str("inbox item id"), outcome: str("task|someday|reference|drop"),
      title: str("task title (for outcome=task)"), initiativeId: str("attach task to initiative"),
      contexts: { type: "array", items: { type: "string" } }, waitingOnPersonId: str("delegate to person"),
      gtdStatus: str("next|someday (for outcome=task)"), dueDate: str("YYYY-MM-DD"),
    }, ["inboxId", "outcome"]),
    handler: async (a) => {
      if (a.outcome === "task") {
        await clarifyToTask(a.inboxId, { title: a.title, initiativeId: a.initiativeId ?? null, contexts: a.contexts, waitingOnPersonId: a.waitingOnPersonId ?? null, gtdStatus: a.gtdStatus, dueDate: a.dueDate ?? null });
      } else {
        await clarifyDrop(a.inboxId, a.outcome);
      }
      return { ok: true };
    },
  },
];
