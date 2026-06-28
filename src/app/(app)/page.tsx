import { getBoard } from "@/lib/queries";
import { StrategyMap } from "@/components/strategy-map";
import { TodayRail } from "@/components/today-rail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await getBoard();
  return (
    <div className="flex flex-col lg:flex-row">
      <section className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-5">
          <div className="eyebrow mb-1">Strategy Map</div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Where to point your attention</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grab a band by its handle to reprioritize — the vertical order is your prioritization. Drag cards to reorder within a band.
          </p>
        </header>
        <StrategyMap board={board} />
      </section>
      <TodayRail />
    </div>
  );
}
