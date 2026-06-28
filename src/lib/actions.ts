"use server";
import { db } from "@/db";
import { domains, initiatives, actions, tasks, activityLog, dependencies, inboxItems, artefacts, projectLinks, processes, processSteps, goals, strategyKernels, kernelActions, people, tags } from "@/db/schema";
import { and, asc, desc, eq, isNull, max , sql } from "drizzle-orm";
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

/* ============================ P3: versatile node payload ============================ */

function revalNode(nodeType: string, nodeId: string) { revalidatePath(`/n/${nodeType}/${nodeId}`); }

/* ---- artefacts (Vercel Blob metadata) ---- */
export async function recordArtefact(nodeType: any, nodeId: string, blobUrl: string, label: string, contentType?: string, sizeBytes?: number) {
  await db.insert(artefacts).values({ nodeType, nodeId, blobUrl, label, contentType: contentType || null, sizeBytes: sizeBytes ?? null });
  await log(nodeType, nodeId, "artefact-added", label);
  revalNode(nodeType, nodeId);
}
export async function removeArtefact(id: string, nodeType: string, nodeId: string) {
  await db.delete(artefacts).where(eq(artefacts.id, id));
  revalNode(nodeType, nodeId);
}

/* ---- project links + best-effort preview ---- */
async function fetchPreview(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 WhatAreNextBot" }, signal: AbortSignal.timeout(6000) });
    const html = await res.text();
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<title[^>]*>([^<]+)<\/title>/i);
    const desc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const image = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const site = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } })();
    return { title: title || null, description: desc || null, image: image || null, site };
  } catch { return null; }
}

export async function addProjectLink(nodeType: any, nodeId: string, url: string, type: any) {
  const u = url.trim(); if (!u) return;
  const preview = await fetchPreview(u);
  const [m] = await db.select({ v: max(projectLinks.sortOrder) }).from(projectLinks).where(and(eq(projectLinks.nodeType, nodeType), eq(projectLinks.nodeId, nodeId)));
  await db.insert(projectLinks).values({
    nodeType, nodeId, url: u, type, title: (preview?.title as string) || null,
    previewJson: preview || null, sortOrder: (m?.v ?? 0) + 1,
  });
  await log(nodeType, nodeId, "link-added", type);
  revalNode(nodeType, nodeId);
}
export async function removeProjectLink(id: string, nodeType: string, nodeId: string) {
  await db.delete(projectLinks).where(eq(projectLinks.id, id));
  revalNode(nodeType, nodeId);
}

/* ---- process / SOP ---- */
export async function createProcess(nodeType: any, nodeId: string, title: string) {
  const t = title.trim(); if (!t) return;
  const [m] = await db.select({ v: max(processes.sortOrder) }).from(processes).where(and(eq(processes.nodeType, nodeType), eq(processes.nodeId, nodeId)));
  await db.insert(processes).values({ nodeType, nodeId, title: t, sortOrder: (m?.v ?? 0) + 1 });
  await log(nodeType, nodeId, "process-created", t);
  revalNode(nodeType, nodeId);
}
export async function addProcessStep(processId: string, text: string, nodeType: string, nodeId: string) {
  const t = text.trim(); if (!t) return;
  const existing = await db.select({ n: processSteps.stepNo }).from(processSteps).where(eq(processSteps.processId, processId));
  const nextNo = existing.reduce((mx, r) => Math.max(mx, r.n), 0) + 1;
  await db.insert(processSteps).values({ processId, stepNo: nextNo, text: t, status: "pending" });
  revalNode(nodeType, nodeId);
}
export async function setStepStatus(stepId: string, status: any, nodeType: string, nodeId: string) {
  await db.update(processSteps).set({ status }).where(eq(processSteps.id, stepId));
  revalNode(nodeType, nodeId);
}
export async function setStepOwner(stepId: string, ownerPersonId: string | null, nodeType: string, nodeId: string) {
  await db.update(processSteps).set({ ownerPersonId }).where(eq(processSteps.id, stepId));
  revalNode(nodeType, nodeId);
}
export async function removeStep(stepId: string, nodeType: string, nodeId: string) {
  await db.delete(processSteps).where(eq(processSteps.id, stepId));
  revalNode(nodeType, nodeId);
}

/* ============================ P4: strategy layer ============================ */

function revalStrategy(goalId?: string) {
  revalidatePath("/strategy"); revalidatePath("/");
  if (goalId) revalidatePath(`/n/goal/${goalId}`);
}

export async function createGoal(title: string) {
  const t = title.trim(); if (!t) return;
  const [m] = await db.select({ v: max(goals.sortOrder) }).from(goals);
  const [g] = await db.insert(goals).values({ title: t, status: "not_started", sortOrder: (m?.v ?? 0) + 1 }).returning();
  await db.insert(strategyKernels).values({ goalId: g.id, guidingPrinciples: [] });
  await log("goal", g.id, "created");
  revalStrategy(g.id);
  return g.id;
}
export async function updateGoal(id: string, patch: { title?: string; status?: any; targetHorizon?: string | null }) {
  await db.update(goals).set({ ...patch, updatedAt: new Date() }).where(eq(goals.id, id));
  revalStrategy(id);
}

export async function saveDiagnosis(kernelId: string, goalId: string, diagnosis: string) {
  await db.update(strategyKernels).set({ diagnosis, updatedAt: new Date() }).where(eq(strategyKernels.id, kernelId));
  revalStrategy(goalId);
}
export async function setGuidingPrinciples(kernelId: string, goalId: string, principles: string[]) {
  await db.update(strategyKernels).set({ guidingPrinciples: principles, updatedAt: new Date() }).where(eq(strategyKernels.id, kernelId));
  revalStrategy(goalId);
}

export async function addCoherentAction(kernelId: string, goalId: string, text: string) {
  const t = text.trim(); if (!t) return;
  const [m] = await db.select({ v: max(kernelActions.sortOrder) }).from(kernelActions).where(eq(kernelActions.kernelId, kernelId));
  await db.insert(kernelActions).values({ kernelId, text: t, sortOrder: (m?.v ?? 0) + 1 });
  revalStrategy(goalId);
}
export async function updateCoherentAction(id: string, goalId: string, text: string) {
  await db.update(kernelActions).set({ text }).where(eq(kernelActions.id, id));
  revalStrategy(goalId);
}
export async function linkCoherentAction(id: string, goalId: string, initiativeId: string | null) {
  await db.update(kernelActions).set({
    linkedNodeType: initiativeId ? "initiative" : null,
    linkedNodeId: initiativeId,
  }).where(eq(kernelActions.id, id));
  revalStrategy(goalId);
}
export async function removeCoherentAction(id: string, goalId: string) {
  await db.delete(kernelActions).where(eq(kernelActions.id, id));
  revalStrategy(goalId);
}

export async function linkInitiativeToGoal(initiativeId: string, goalId: string | null) {
  await db.update(initiatives).set({ goalId, updatedAt: new Date() }).where(eq(initiatives.id, initiativeId));
  await log("initiative", initiativeId, goalId ? "linked-to-goal" : "unlinked-from-goal");
  revalStrategy(goalId || undefined);
  revalidatePath(`/n/initiative/${initiativeId}`);
}

/* ============================ People roster management ============================ */
const PERSON_COLORS = ["#0055FF","#002054","#F96EB1","#16A34A","#F59E0B","#7C3AED","#0891B2","#DC2626","#DB2777","#0D9488","#CA8A04","#2563EB"];

export async function createPerson(name: string, role?: string, team?: string) {
  const n = name.trim(); if (!n) return;
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(people);
  const color = PERSON_COLORS[(c ?? 0) % PERSON_COLORS.length];
  await db.insert(people).values({ name: n, role: role?.trim() || null, team: team?.trim() || null, avatarColor: color });
  revalidatePath("/people"); revalidatePath("/");
}
export async function updatePerson(id: string, patch: { name?: string; role?: string | null; team?: string | null }) {
  await db.update(people).set(patch).where(eq(people.id, id));
  revalidatePath("/people");
}
export async function archivePerson(id: string) {
  await db.update(people).set({ archivedAt: new Date() }).where(eq(people.id, id));
  revalidatePath("/people"); revalidatePath("/");
}

/* Quick-add a task straight into a GTD list (Next Actions / Someday). */
export async function addTaskToList(title: string, status: "next" | "someday", contexts: string[] = [], initiativeId: string | null = null) {
  const t = title.trim(); if (!t) return;
  const [m] = await db.select({ v: max(tasks.sortOrder) }).from(tasks);
  const [row] = await db.insert(tasks).values({
    title: t, gtdStatus: status, isNextAction: status === "next",
    contexts, initiativeId: initiativeId || null, sortOrder: (m?.v ?? 0) + 1,
  }).returning();
  await log("task", row.id, "created");
  revalGtd();
}

/* ============================ Contexts (GTD @contexts registry) ============================ */
function normContext(s: string) {
  let v = s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9@\-]/g, "");
  if (!v) return "";
  if (!v.startsWith("@")) v = "@" + v;
  return v;
}
export async function addContext(name: string) {
  const v = normContext(name); if (!v) return;
  const existing = await db.select().from(tags).where(and(eq(tags.kind, "context"), eq(tags.name, v)));
  if (existing.length === 0) await db.insert(tags).values({ name: v, kind: "context" });
  revalidatePath("/gtd"); revalidatePath("/inbox"); revalidatePath("/");
}
export async function removeContext(name: string) {
  await db.delete(tags).where(and(eq(tags.kind, "context"), eq(tags.name, name)));
  revalidatePath("/gtd"); revalidatePath("/inbox"); revalidatePath("/");
}

/* Rename any node's title (goal / initiative / action / task). */
export async function renameNode(kind: "goal" | "initiative" | "action" | "task", id: string, title: string) {
  const t = title.trim(); if (!t) return;
  if (kind === "goal") await db.update(goals).set({ title: t, updatedAt: new Date() }).where(eq(goals.id, id));
  else if (kind === "initiative") await db.update(initiatives).set({ title: t, updatedAt: new Date() }).where(eq(initiatives.id, id));
  else if (kind === "action") await db.update(actions).set({ title: t, updatedAt: new Date() }).where(eq(actions.id, id));
  else if (kind === "task") await db.update(tasks).set({ title: t, updatedAt: new Date() }).where(eq(tasks.id, id));
  await log(kind, id, "renamed");
  revalidatePath(`/n/${kind}/${id}`); revalidatePath("/"); revalidatePath("/strategy"); revalidatePath("/gtd");
}
