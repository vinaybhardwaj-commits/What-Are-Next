import { Card, CardContent } from "@/components/ui/card";
import { HealthDot } from "@/components/health-dot";

const SEED_DOMAINS = [
  { name: "Tech", color: "#0055FF", initiatives: ["Pulse 2", "Scribe", "KX", "CDMSS", "Daily Dash"] },
  { name: "Ops", color: "#F96EB1", initiatives: ["BRM", "FMS Tracker", "HK Tracker", "Sewa"] },
  { name: "Clinical Gov", color: "#002054", initiatives: ["Governance.evenos.app", "OT Black Box", "Physician Handover", "MedAudit"] },
  { name: "Clinical Qual", color: "#16A34A", initiatives: ["MRD Overhaul", "Physician Score Card"] },
];

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_340px]">
      {/* Strategy Map */}
      <section className="min-w-0 p-6">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-even-navy">Strategy Map</h1>
          <p className="text-sm text-muted-foreground">
            Reorderable domain bands — vertical order is your prioritization. (Drag/reorder ships in P1.)
          </p>
        </header>
        <div className="space-y-4">
          {SEED_DOMAINS.map((d) => (
            <div key={d.name} className="overflow-hidden rounded-xl border bg-white">
              <div className="flex items-center gap-3 border-l-4 px-4 py-3" style={{ borderColor: d.color }}>
                <HealthDot health="green" />
                <span className="font-medium text-even-navy">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.initiatives.length} initiatives</span>
              </div>
              <div className="flex flex-wrap gap-3 p-4">
                {d.initiatives.map((i) => (
                  <Card key={i} className="w-44">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{i}</span>
                        <HealthDot health="green" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Today rail */}
      <aside className="border-l bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-even-navy">Today</h2>
        <p className="mb-5 text-sm text-muted-foreground">Next actions, waiting-ons, blocked, tickler.</p>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-dashed p-4">
            The GTD engine arrives in P2 — next actions, waiting-on aging, blocked, and tickler will surface here.
          </div>
        </div>
      </aside>
    </div>
  );
}
