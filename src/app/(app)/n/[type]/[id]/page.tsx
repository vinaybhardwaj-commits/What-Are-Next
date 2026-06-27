import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getInitiative, getAction } from "@/lib/queries";
import { getTaskDetail, getContexts } from "@/lib/gtd";
import { getGoalDetail, getGoals } from "@/lib/strategy";
import { KernelEditor } from "@/components/kernel-editor";
import { GoalStatus } from "@/components/goal-status";
import { GoalHorizon } from "@/components/goal-horizon";
import { InitiativeGoalLinker } from "@/components/initiative-goal-linker";
import { KernelCritique } from "@/components/kernel-critique";
import { NudgeDraft } from "@/components/nudge-draft";
import { NotesEditor } from "@/components/notes-editor";
import { TaskList } from "@/components/task-list";
import { AddAction } from "@/components/add-action";
import { TaskDetail } from "@/components/task-detail";
import { HealthDot } from "@/components/health-dot";
import { NodePayload } from "@/components/node-payload";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function NodePage({ params }: { params: { type: string; id: string } }) {
  const { type, id } = params;

  if (type === "goal") {
    const data = await getGoalDetail(id);
    if (!data) notFound();
    const { goal, kernel, coherent, linkedInitiatives, allInitiatives, guidingPrinciples } = data;
    const swe = coherent.length > 0 && coherent.some((c) => !c.linkedNodeId);
    return (
      <div className="max-w-3xl p-6">
        <Link href="/strategy" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Strategy</Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-even-navy">{goal.title}</h1>
          <GoalStatus id={goal.id} status={goal.status} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <GoalHorizon id={goal.id} horizon={goal.targetHorizon} />
          {swe && <span className="inline-flex items-center gap-1 rounded bg-health-amber/15 px-2 py-0.5 text-xs text-health-amber">strategy without execution</span>}
        </div>
        <Section title="Strategy Kernel (Rumelt)">
          <KernelEditor goalId={goal.id} kernelId={kernel.id} diagnosis={kernel.diagnosis} principles={guidingPrinciples}
            coherent={coherent.map((c) => ({ id: c.id, text: c.text, linkedNodeId: c.linkedNodeId, linkedTitle: c.linkedTitle }))}
            allInitiatives={allInitiatives.map((i) => ({ id: i.id, title: i.title }))} />
          <div className="mt-4"><KernelCritique goalId={goal.id} /></div>
        </Section>
        <Section title={`Linked initiatives (${linkedInitiatives.length})`}>
          {linkedInitiatives.length === 0 ? <p className="text-sm text-muted-foreground">No initiatives linked yet. Link them from an initiative page or via a coherent action above.</p> : (
            <ul className="space-y-2">
              {linkedInitiatives.map((i) => <li key={i.id}><Link href={`/n/initiative/${i.id}`} className="block rounded-lg border bg-white px-3 py-2 text-sm hover:bg-secondary">{i.title}</Link></li>)}
            </ul>
          )}
        </Section>
        <NodePayload nodeType="goal" nodeId={id} />
      </div>
    );
  }

  if (type === "task") {
    const [data, contexts] = await Promise.all([getTaskDetail(id), getContexts()]);
    if (!data) notFound();
    const { task, people, dependencies, log } = data;
    const t = {
      id: task.id, title: task.title, notes: task.notes, gtdStatus: task.gtdStatus,
      contexts: task.contexts ?? [], priority: task.priority,
      assigneePersonId: task.assigneePersonId, waitingOnPersonId: task.waitingOnPersonId,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      deferUntil: task.deferUntil ? new Date(task.deferUntil).toISOString() : null,
      completionNote: task.completionNote,
    };
    const persons = people.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor }));
    const deps = dependencies.map((d) => ({ id: d.id, state: d.state, externalLabel: d.externalLabel, resolutionNote: d.resolutionNote, blockerNodeType: d.blockerNodeType }));
    return (
      <div className="max-w-3xl p-6">
        <Link href="/gtd" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> GTD Lists</Link>
        <h1 className="mt-1 text-2xl font-semibold text-even-navy">{task.title}</h1>
        <div className="mt-4"><TaskDetail task={t} people={persons} deps={deps} contexts={contexts} /></div>
        {task.waitingOnPersonId && <div className="mt-4"><NudgeDraft taskId={id} /></div>}
        <NodePayload nodeType="task" nodeId={id} />
        {log.length > 0 && (
          <Section title="History">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {log.map((l) => <li key={l.id}><span className="font-medium text-foreground">{l.event}</span>{l.note ? ` — ${l.note}` : ""} · {new Date(l.at).toLocaleString()}</li>)}
            </ul>
          </Section>
        )}
      </div>
    );
  }

  if (type === "initiative") {
    const [data, goalsList] = await Promise.all([getInitiative(id), getGoals()]);
    if (!data) notFound();
    const { initiative, domain, actions } = data;
    return (
      <div className="max-w-3xl p-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Strategy Map</Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {domain && <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: (domain.color || "#0055FF") + "22", color: domain.color || undefined }}>{domain.name}</span>}
          {initiative.gtdStatus === "someday" && <span className="rounded bg-secondary px-1.5 py-0.5">someday</span>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-even-navy">{initiative.title}</h1>
        <div className="mt-3"><InitiativeGoalLinker initiativeId={id} goalId={initiative.goalId} goals={goalsList.map((g) => ({ id: g.id, title: g.title }))} /></div>
        <Section title="Notes"><NotesEditor nodeType="initiative" id={id} initial={initiative.notes ?? ""} /></Section>
        <Section title={`Actions (${actions.length})`}>
          <ul className="space-y-2">
            {actions.map((a) => (
              <li key={a.id}>
                <Link href={`/n/action/${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-secondary">
                  <span className="flex items-center gap-2">
                    {a.sequence != null && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">Time {a.sequence}</span>}
                    <span className={a.gtdStatus === "someday" ? "text-muted-foreground" : ""}>{a.title}</span>
                  </span>
                  <HealthDot health={a.gtdStatus === "someday" ? "amber" : "green"} />
                </Link>
              </li>
            ))}
          </ul>
          <AddAction initiativeId={id} />
        </Section>
        <NodePayload nodeType="initiative" nodeId={id} />
      </div>
    );
  }

  if (type === "action") {
    const data = await getAction(id);
    if (!data) notFound();
    const { action, initiative, tasks } = data;
    return (
      <div className="max-w-3xl p-6">
        <Link href={initiative ? `/n/initiative/${initiative.id}` : "/"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> {initiative?.title ?? "Back"}</Link>
        <h1 className="mt-1 text-2xl font-semibold text-even-navy">{action.title}</h1>
        <Section title="Notes"><NotesEditor nodeType="action" id={id} initial={action.notes ?? ""} /></Section>
        <Section title={`Tasks (${tasks.length})`}><TaskList actionId={id} tasks={tasks.map((t) => ({ id: t.id, title: t.title, gtdStatus: t.gtdStatus }))} /></Section>
        <NodePayload nodeType="action" nodeId={id} />
      </div>
    );
  }

  notFound();
}
