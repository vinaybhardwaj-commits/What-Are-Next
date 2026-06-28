import { db } from "@/db";
import { isNull } from "drizzle-orm";
import { people } from "@/db/schema";
import { getEnrichedTasks, bucketize, getContexts } from "@/lib/gtd";
import { GtdLists } from "@/components/gtd-lists";

export const dynamic = "force-dynamic";

export default async function GtdPage() {
  const [all, ppl, contexts] = await Promise.all([getEnrichedTasks(), db.select().from(people).where(isNull(people.archivedAt)), getContexts()]);
  const b = bucketize(all);
  const inBucket = (id: string) => {
    const ks: string[] = [];
    for (const [k, arr] of Object.entries(b)) if ((arr as any[]).some((t) => t.id === id)) ks.push(k);
    return ks;
  };
  const tasks = all.map((t) => ({
    id: t.id, title: t.title, gtdStatus: t.gtdStatus, contexts: t.contexts,
    assignee: t.assignee, waitingOn: t.waitingOn, waitingDays: t.waitingDays,
    blocked: t.blocked, blockers: t.blockers, path: t.path, buckets: inBucket(t.id),
  }));
  const persons = ppl.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor }));
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold text-foreground">GTD Lists</h1>
      <GtdLists tasks={tasks} people={persons} contexts={contexts} />
    </div>
  );
}
