"use server";
import { db } from "@/db";
import { domains, initiatives, actions, tasks, activityLog } from "@/db/schema";
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
export async function updateNotes(nodeType: "initiative" | "action", id: string, notes: string) {
  if (nodeType === "initiative") await db.update(initiatives).set({ notes, updatedAt: new Date() }).where(eq(initiatives.id, id));
  else await db.update(actions).set({ notes, updatedAt: new Date() }).where(eq(actions.id, id));
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
