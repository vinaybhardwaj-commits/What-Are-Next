"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Inbox, ListChecks, Users, RotateCw, Crosshair } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strategy", label: "Strategy", icon: Crosshair },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/gtd", label: "Lists", icon: ListChecks },
  { href: "/people", label: "People", icon: Users },
  { href: "/review", label: "Review", icon: RotateCw },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 border-t border-border bg-even-navy/95 backdrop-blur md:hidden">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="relative flex flex-1 flex-col items-center justify-center gap-0.5">
            {active && <span className="absolute top-0 h-0.5 w-8 bg-primary" />}
            <Icon className={cn("h-[19px] w-[19px]", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
            <span className={cn("font-mono text-[9px] uppercase tracking-wider", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
