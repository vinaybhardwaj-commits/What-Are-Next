import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getGoals } from "@/lib/strategy";
import { CreateGoal } from "@/components/create-goal";
import { GoalStatus } from "@/components/goal-status";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  const goals = await getGoals();
  return (
    <div className="max-w-3xl p-6">
      <h1 className="text-xl font-semibold text-even-navy">Strategy</h1>
      <p className="mb-5 text-sm text-muted-foreground">Quarter goals, each justified by a Rumelt kernel (diagnosis → guiding principles → coherent actions) that links down to real execution.</p>
      <CreateGoal />
      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No goals yet. Author your first above — then build its kernel and link it to initiatives.</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-4">
              <Link href={`/n/goal/${g.id}`} className="min-w-0 flex-1 hover:opacity-80">
                <div className="font-medium text-even-navy">{g.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {g.targetHorizon && <span className="rounded bg-secondary px-1.5 py-0.5">{g.targetHorizon}</span>}
                  {g.hasKernel ? <span>{g.coherentCount} coherent action{g.coherentCount !== 1 ? "s" : ""}</span> : <span className="italic">no kernel yet</span>}
                  <span>· {g.linkedInitiativeCount} initiative{g.linkedInitiativeCount !== 1 ? "s" : ""} linked</span>
                  {g.strategyWithoutExecution && <span className="inline-flex items-center gap-1 rounded bg-health-amber/15 px-1.5 py-0.5 text-health-amber"><AlertTriangle className="h-3 w-3" />strategy without execution</span>}
                </div>
              </Link>
              <GoalStatus id={g.id} status={g.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
