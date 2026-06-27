import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getInitiative, getAction } from "@/lib/queries";
import { NotesEditor } from "@/components/notes-editor";
import { TaskList } from "@/components/task-list";
import { AddAction } from "@/components/add-action";
import { HealthDot } from "@/components/health-dot";

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

  if (type === "initiative") {
    const data = await getInitiative(id);
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
      </div>
    );
  }

  notFound();
}
