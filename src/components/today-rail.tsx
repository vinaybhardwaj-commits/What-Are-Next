import type { Board } from "@/lib/queries";

export function TodayRail({ board }: { board: Board }) {
  const initiatives = board.reduce((n, d) => n + d.initiatives.length, 0);
  const someday = board.reduce((n, d) => n + d.initiatives.filter((i) => i.gtdStatus === "someday").length, 0);
  return (
    <aside className="border-l bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-even-navy">Today</h2>
      <p className="mb-5 text-sm text-muted-foreground">Next actions, waiting-ons, blocked, tickler.</p>
      <dl className="mb-5 grid grid-cols-3 gap-2 text-center">
        <Stat n={board.length} label="domains" />
        <Stat n={initiatives} label="initiatives" />
        <Stat n={someday} label="someday" />
      </dl>
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        The GTD engine arrives in P2 — next actions, waiting-on aging, blocked, and tickler will surface here.
      </div>
    </aside>
  );
}
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border bg-even-surface py-3">
      <div className="text-xl font-semibold text-even-navy">{n}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
