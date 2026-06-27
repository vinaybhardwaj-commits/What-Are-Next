import { ReviewCopilot } from "@/components/review-copilot";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-xl font-semibold text-even-navy">Weekly Review</h1>
      <p className="mb-5 text-sm text-muted-foreground">The GTD keystone. The copilot does the legwork — surfacing what got done, stale waiting-ons to nudge, Someday candidates, and goals with no movement. You drive.</p>
      <ReviewCopilot />
    </div>
  );
}
