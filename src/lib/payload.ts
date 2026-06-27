import "server-only";
import { db } from "@/db";
import { artefacts, projectLinks, processes, processSteps, people } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type NodeType = "initiative" | "action" | "task" | "goal";

export async function getNodePayload(nodeType: NodeType, nodeId: string) {
  const [arts, links, procs, ppl] = await Promise.all([
    db.select().from(artefacts).where(and(eq(artefacts.nodeType, nodeType), eq(artefacts.nodeId, nodeId))).orderBy(asc(artefacts.uploadedAt)),
    db.select().from(projectLinks).where(and(eq(projectLinks.nodeType, nodeType), eq(projectLinks.nodeId, nodeId))).orderBy(asc(projectLinks.sortOrder)),
    db.select().from(processes).where(and(eq(processes.nodeType, nodeType), eq(processes.nodeId, nodeId))).orderBy(asc(processes.sortOrder)),
    db.select().from(people).orderBy(asc(people.name)),
  ]);
  const procIds = procs.map((p) => p.id);
  let steps: typeof processSteps.$inferSelect[] = [];
  if (procIds.length) {
    steps = await db.select().from(processSteps).orderBy(asc(processSteps.stepNo));
    steps = steps.filter((s) => procIds.includes(s.processId));
  }
  const stepsByProc = new Map<string, typeof steps>();
  for (const s of steps) { const a = stepsByProc.get(s.processId) || []; a.push(s); stepsByProc.set(s.processId, a); }
  return {
    artefacts: arts,
    links: links.map((l) => ({ ...l, preview: (l.previewJson as any) || null })),
    processes: procs.map((p) => ({ ...p, steps: stepsByProc.get(p.id) || [] })),
    people: ppl.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor })),
  };
}
