import { cn } from "@/lib/utils";
export type Health = "green" | "amber" | "red";
export function HealthDot({ health, className }: { health: Health; className?: string }) {
  const map = { green: "bg-health-green", amber: "bg-health-amber", red: "bg-health-red" };
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", map[health], className)} aria-label={health} />;
}
