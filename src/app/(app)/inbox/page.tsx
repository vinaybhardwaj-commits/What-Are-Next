import { getInbox, getClarifyTargets, getContexts } from "@/lib/gtd";
import { ClarifyRow } from "@/components/clarify-row";
import { InboxQuickAdd } from "@/components/inbox-quick-add";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [items, targets, contexts] = await Promise.all([getInbox(), getClarifyTargets(), getContexts()]);
  return (
    <div className="max-w-2xl p-4 md:p-6">
      <h1 className="text-xl font-semibold text-foreground">Inbox</h1>
      <p className="mb-4 text-sm text-muted-foreground">Type a to-do below (or press <kbd className="rounded border px-1">c</kbd> anywhere). Then clarify each item: actionable → Task, else Someday or Drop.</p>
      <InboxQuickAdd />
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Inbox zero. Nice.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => <ClarifyRow key={it.id} item={{ id: it.id, rawText: it.rawText }} initiatives={targets.initiatives} people={targets.people} contexts={contexts} />)}
        </div>
      )}
    </div>
  );
}
