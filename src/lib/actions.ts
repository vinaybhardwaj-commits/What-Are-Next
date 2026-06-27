"use server";
import { db } from "@/db";
import { domains, initiatives, actions, tasks, activityLog, dependencies, inboxItems } from "@/db/schema";
import { and, asc, desc, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function log(nodeType: any, nodeId: string, event: string, note?: string) {
  await db.insert(activityLog).values({ nodeType, nodeId, event, note });
}

/* ---------------- reorder ---------------- */
export async function reorderDomains(ids: string[]) {
  await Promise.all(ids.map((id, i) =>
    db.update(domains).set({ sortOrder: i, updatedAt: new Date() }).where(eq(domains.id, id))));
  revalidatePath("/");
}

export async function reorderInitiatives(ids: string[]) {
  await Promise.all(ids.map((id, i) =>
    db.update(initiatives).set({ sortOrder: i, updatedAt: new Date() }).where(eq(initiatives.id, id))));
  revalidatePath("/");
}

export async function moveInitiative(initiativeId: string, toDomainId: string, orderedIds: string[]) {
  await db.update(initiatives).set({ domainId: toDomainId, updatedAt: new Date() }).where(eq(initiatives.id, initiativeId));
  await Promise.all(orderedIds.map((id, i) =>
    db.update(initiatives).set({ sortOrder: i }).where(eq(initiatives.id, id))));
  await log("initiative", initiativeId, "moved", `→ domain ${toDomainId}`);
  revalidatePath("/");
}

/* ---------------- domain CRUD ---------------- */
export async function createDomain(name: string, color: string) {
  const [m] = await db.select({ v: max(domains.sortOrder) }).from(domains);
  const [d] = await db.insert(domains).values({ name, color, sortOrder: (m?.v ?? 0) + 1 }).returning();
  await log("domain", d.id, "created");
  revalidatePath("/");
}
export async function renameDomain(id: string, name: string) {
  await db.update(domains).set({ name, updatedAt: new Date() }).where(eq(domains.id, id));
  revalidatePath("/");
}
export async function recolorDomain(id: string, color: string) {
  await db.update(domains).set({ color, updatedAt: new Date() }).where(eq(domains.id, id));
  revalidatePath("/");
}
export async function toggleDomainCollapse(id: string, collapsed: boolean) {
  await db.update(domains).set({ collapsed, updatedAt: new Date() }).where(eq(domains.id, id));
  revalidatePath("/");
}
export async function archiveDomain(id: string) {
  await db.update(domains).set({ archivedAt: new Date() }).where(eq(domains.id, id));
  await log("domain", id, "archived");
  revalidatePath("/");
}

/* ---------------- initiative CRUD ---------------- */
export async function createInitiative(domainId: string, title: string) {
  const [m] = await db.select({ v: max(initiatives.sortOrder) }).from(initiatives).where(eq(initiatives.domainId, domainId));
  const [i] = await db.insert(initiatives).values({ domainId, title, sortOrder: (m?.v ?? 0) + 1 }).returning();
  await log("initiative", i.id, "created");
  revalidatePath("/");
}
export async function archiveInitiative(id: string) {
  await db.update(initiatives).set({ archivedAt: new Date() }).where(eq(initiatives.id, id));
  await log("initiative", id, "archived");
  revalidatePath("/");
}

/* ---------------- notes (polymorphic) ---------------- */
export async function updateNotes(nodeType: "initiative" | "action" | "task", id: string, notes: string) {
  if (nodeType === "initiative") await db.update(initiatives).set({ notes, updatedAt: new Date() }).where(eq(initiatives.id, id));
  else if (nodeType === "action") await db.update(actions).set({ notes, updatedAt: new Date() }).where(eq(actions.id, id));
  else await db.update(tasks).set({ notes, updatedAt: new Date() }).where(eq(tasks.id, id));
  revalidatePath(`/n/${nodeType}/${id}`);
}

/* ---------------- action + task CRUD ---------------- */
export async function createAction(initiativeId: string, title: string) {
  const [m] = await db.select({ v: max(actions.sortOrder) }).from(actions).where(eq(actions.initiativeId, initiativeId));
  await db.insert(actions).values({ initiativeId, title, sortOrder: (m?.v ?? 0) + 1 });
  revalidatePath(`/n/initiative/${initiativeId}`);
}
export async function createTask(actionId: string, title: string) {
  const [m] = await db.select({ v: max(tasks.sortOrder) }).from(tasks).where(eq(tasks.actionId, actionId));
  const [t] = await db.insert(tasks).values({ actionId, title, gtdStatus: "next", sortOrder: (m?.v ?? 0) + 1 }).returning();
  await log("task", t.id, "created");
  revalidatePath(`/n/action/${actionId}`);
}
export async function toggleTask(id: string, done: boolean, actionId: string) {
  await db.update(tasks).set({
    gtdStatus: done ? "done" : "next",
    completedAt: done ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(tasks.id, id));
  await log("task", id, done ? "completed" : "reopened");
  revalidatePath(`/n/action/${actionId}`);
}

/* ============================ P2: GTD engine ============================ */

function revalGtd() {
  revalidatePath("/"); revalidatePath("/inbox"); revalidatePath("/gtd"); revalidatePath("/people");
}

/* ---- capture + inbox + clarify ---- */
export async function captureInbox(rawText: string) {
  const t = rawText.trim(); if (!t) return;
  await db.insert(inboxItems).values({ rawText: t });
  revalidatePath("/inbox"); revalidatePath("/");
}

export async function clarifyToTask(inboxId: string, opts: {
  title: string; initiativeId?: string | null; contexts?: string[];
  waitingOnPersonId?: string | null; gtdStatus?: "next" | "someday"; dueDate?: string | null;
}) {
  const waiting = !!opts.waitingOnPersonId;
  const [m] = await db.select({ v: max(tasks.sortOrder) }).from(tasks);
  const [t] = await db.insert(tasks).values({
    title: opts.title.trim(),
    initiativeId: opts.initiativeId || null,
    contexts: opts.contexts || [],
    waitingOnPersonId: opts.waitingOnPersonId || null,
    waitingSince: waiting ? new Date() : null,
    gtdStatus: waiting ? "waiting" : (opts.gtdStatus || "next"),
    isNextAction: !waiting && (opts.gtdStatus || "next") === "next",
    dueDate: opts.dueDate ? new Date(opts.dueDate) : null,
    sortOrder: (m?.v ?? 0) + 1,
  }).returning();
  await db.update(inboxItems).set({ processedAt: new Date(), promotedToType: "task", promotedToId: t.id }).where(eq(inboxItems.id, inboxId));
  await log("task", t.id, "clarified", "from inbox");
  revalGtd();
}

export async function clarifyDrop(inboxId: string, outcome: "someday" | "reference" | "drop") {
  const item = (await db.select().from(inboxItems).where(eq(inboxItems.id, inboxId)))[0];
  if (!item) return;
  if (outcome === "someday") {
    const [t] = await db.insert(tasks).values({ title: item.rawText, gtdStatus: "someday" }).returning();
    await db.update(inboxItems).set({ processedAt: new Date(), promotedToType: "task", promotedToId: t.id }).where(eq(inboxItems.id, inboxId));
  } else {
    await db.update(inboxItems).set({ processedAt: new Date() }).where(eq(inboxItems.id, inboxId));
  }
  revalGtd();
}

/* ---- task field setters ---- */

export async function setAssignee(id: string, personId: string | null) {
  await db.update(tasks).set({ assigneePersonId: personId, updatedAt: new Date() }).where(eq(tasks.id, id));
  await log("task", id, personId ? "assigned" : "unassigned");
  revalGtd();
}
export async function setWaitingOn(id: string, personId: string | null) {
  if (personId) {
    await db.update(tasks).set({ waitingOnPersonId: personId, waitingSince: new Date(), gtdStatus: "waiting", isNextAction: false, updatedAt: new Date() }).where(eq(tasks.id, id));
    await log("task", id, "waiting", `on person ${personId}`);
  } else {
    await db.update(tasks).set({ waitingOnPersonId: null, waitingSince: null, gtdStatus: "next", updatedAt: new Date() }).where(eq(tasks.id, id));
    await log("task", id, "waiting-cleared");
  }
  revalGtd();
}
export async function setContexts(id: string, contexts: string[]) {
  await db.update(tasks).set({ contexts, updatedAt: new Date() }).where(eq(tasks.id, id)); revalGtd();
}
export async function setPriority(id: string, priority: number | null) {
  await db.update(tasks).set({ priority, updatedAt: new Date() }).where(eq(tasks.id, id)); revalGtd();
}
export async function setGtdStatus(id: string, gtdStatus: "inbox" | "next" | "waiting" | "scheduled" | "someday" | "done" | "dropped") {
  await db.update(tasks).set({ gtdStatus, isNextAction: gtdStatus === "next", updatedAt: new Date() }).where(eq(tasks.id, id));
  await log("task", id, gtdStatus); revalGtd();
}
export async function setDefer(id: string, deferUntil: string | null) {
  await db.update(tasks).set({ deferUntil: deferUntil ? new Date(deferUntil) : null, gtdStatus: deferUntil ? "scheduled" : "next", updatedAt: new Date() }).where(eq(tasks.id, id)); revalGtd();
}
export async function dropTask(id: string) {
  await db.update(tasks).set({ gtdStatus: "dropped", updatedAt: new Date() }).where(eq(tasks.id, id));
  await log("task", id, "dropped"); revalGtd();
}

/* ---- completion with optional note ---- */
export async function completeTask(id: string, completionNote?: string) {
  await db.update(tasks).set({ gtdStatus: "done", completedAt: new Date(), completionNote: completionNote?.trim() || null, updatedAt: new Date() }).where(eq(tasks.id, id));
  await log("task", id, "completed", completionNote?.trim() || undefined);
  revalGtd(); revalidatePath(`/n/task/${id}`);
}
export async function reopenTask(id: string) {
  await db.update(tasks).set({ gtdStatus: "next", completedAt: null, updatedAt: new Date() }).where(eq(tasks.id, id));
  await log("task", id, "reopened"); revalGtd();
}

/* ---- blockers: first-class, resolvable, audited ---- */
export async function addBlocker(taskId: string, opts: { externalLabel?: string; blockerInitiativeId?: string }) {
  await db.insert(dependencies).values({
    dependentNodeType: "task", dependentNodeId: taskId,
    blockerNodeType: opts.blockerInitiativeId ? "initiative" : null,
    blockerNodeId: opts.blockerInitiativeId || null,
    externalLabel: opts.externalLabel?.trim() || null,
    state: "active",
  });
  // a blocked task is no longer a next action
  await db.update(tasks).set({ isNextAction: false }).where(eq(tasks.id, taskId));
  await log("task", taskId, "blocked", opts.externalLabel?.trim() || "dependency");
  revalGtd(); revalidatePath(`/n/task/${taskId}`);
}

export async function resolveBlocker(depId: string, resolutionNote: string) {
  const [dep] = await db.select().from(dependencies).where(eq(dependencies.id, depId));
  if (!dep) return;
  await db.update(dependencies).set({ state: "resolved", resolutionNote: resolutionNote.trim(), resolvedAt: new Date(), resolvedBy: "V" }).where(eq(dependencies.id, depId));
  await log(dep.dependentNodeType, dep.dependentNodeId, "unblocked", resolutionNote.trim());
  // if no active blockers remain → surface back to next with newly-unblocked flag
  const remaining = await db.select().from(dependencies)
    .where(and(eq(dependencies.dependentNodeType, dep.dependentNodeType), eq(dependencies.dependentNodeId, dep.dependentNodeId), eq(dependencies.state, "active")));
  if (remaining.length === 0 && dep.dependentNodeType === "task") {
    await db.update(tasks).set({ gtdStatus: "next", isNextAction: true, updatedAt: new Date() }).where(eq(tasks.id, dep.dependentNodeId));
    await log("task", dep.dependentNodeId, "newly-unblocked");
  }
  revalGtd(); revalidatePath(`/n/task/${dep.dependentNodeId}`);
}

/* ---- standalone task create (under initiative, for GTD) ---- */
export async function quickTask(initiativeId: string | null, title: string) {
  const v = title.trim(); if (!v) return;
  const [m] = await db.select({ v: max(tasks.sortOrder) }).from(tasks);
  const [t] = await db.insert(tasks).values({ title: v, initiativeId, gtdStatus: "next", isNextAction: true, sortOrder: (m?.v ?? 0) + 1 }).returning();
  await log("task", t.id, "created");
  revalGtd();
}

export async function setDue(id: string, dueDate: string | null) {
  await db.update(tasks).set({ dueDate: dueDate ? new Date(dueDate) : null, updatedAt: new Date() }).where(eq(tasks.id, id));
  revalGtd(); revalidatePath(`/n/task/${id}`);
}
