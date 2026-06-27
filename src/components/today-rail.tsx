import Link from "next/link";
import { db } from "@/db";
import { people } from "@/db/schema";
import { getEnrichedTasks, bucketize } from "@/lib/gtd";
import { TaskRow } from "@/components/task-row";

export async function TodayRail() {
  const [all, ppl] = await Promise.all([getEnrichedTasks(), db.select().from(people)]);
  const b = bucketize(all);
  const persons = ppl.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor }));

  const Section = ({ title, items, tone }: { title: string; items: typeof b.next; tone?: string }) =>
    items.length === 0 ? null : (
      <div>
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: tone }}>{title}<span className="text-muted-foreground">{items.length}</span></div>
        <div className="space-y-1.5">{items.slice(0, 8).map((t) => <TaskRow key={t.id} task={t} people={persons} />)}</div>
      </div>
    );

  const empty = b.next.length + b.waiting.length + b.blocked.length + b.tickler.length === 0;

  return (
    <aside className="w-[340px] shrink-0 overflow-y-auto border-l bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-even-navy">Today</h2>
        <Link href="/gtd" className="text-xs text-primary hover:underline">All lists →</Link>
      </div>
      {empty ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nothing queued. Press <kbd className="rounded border px-1">c</kbd> to capture, then clarify from the Inbox.
        </div>
      ) : (
        <div className="space-y-5">
          <Section title="Next" items={b.next} tone="#0055FF" />
          <Section title="Waiting" items={b.waiting} tone="#F59E0B" />
          <Section title="Blocked" items={b.blocked} tone="#F96EB1" />
          <Section title="Tickler — due" items={b.tickler} tone="#002054" />
        </div>
      )}
    </aside>
  );
}
