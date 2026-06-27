import { getPeopleFollowups } from "@/lib/gtd";
import { TaskRow } from "@/components/task-row";
import { Avatar } from "@/components/avatars";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const rows = await getPeopleFollowups();
  const persons = rows.map((r) => ({ id: r.person.id, name: r.person.name, color: r.person.avatarColor }));
  const active = rows.filter((r) => r.waitingOn.length + r.assigned.length > 0);
  return (
    <div className="max-w-3xl p-6">
      <h1 className="text-xl font-semibold text-even-navy">People</h1>
      <p className="mb-5 text-sm text-muted-foreground">Who you're waiting on and what you've delegated. Your follow-up surface.</p>
      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No open waiting-ons or delegations yet. Set "waiting on" from any task.</div>
      ) : (
        <div className="space-y-5">
          {active.map((r) => (
            <div key={r.person.id} className="rounded-xl border bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Avatar name={r.person.name} color={r.person.avatarColor} />
                <span className="font-medium text-even-navy">{r.person.name}</span>
                {r.person.role && <span className="text-xs text-muted-foreground">{r.person.role}</span>}
              </div>
              {r.waitingOn.length > 0 && <><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-health-amber">Waiting on ({r.waitingOn.length})</div><div className="mb-3 space-y-1.5">{r.waitingOn.map((t) => <TaskRow key={t.id} task={t} people={persons} />)}</div></>}
              {r.assigned.length > 0 && <><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delegated ({r.assigned.length})</div><div className="space-y-1.5">{r.assigned.map((t) => <TaskRow key={t.id} task={t} people={persons} />)}</div></>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
