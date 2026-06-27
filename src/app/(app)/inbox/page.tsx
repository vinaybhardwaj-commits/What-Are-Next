import { getInbox, getClarifyTargets } from "@/lib/gtd";
import { ClarifyRow } from "@/components/clarify-row";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [items, targets] = await Promise.all([getInbox(), getClarifyTargets()]);
  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-xl font-semibold text-even-navy">Inbox</h1>
      <p className="mb-5 text-sm text-muted-foreground">Capture anything with <kbd className="rounded border px-1">c</kbd>. Clarify each item: actionable → Task, else Someday or Drop.</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Inbox zero. Nice.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => <ClarifyRow key={it.id} item={{ id: it.id, rawText: it.rawText }} initiatives={targets.initiatives} people={targets.people} />)}
        </div>
      )}
    </div>
  );
}
