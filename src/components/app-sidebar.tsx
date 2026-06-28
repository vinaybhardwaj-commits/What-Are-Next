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

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-even-navy md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary">
          <div className="h-2.5 w-2.5 rotate-45 bg-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-foreground">What Are Next</div>
          <div className="eyebrow">Command Center</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 eyebrow">v1.0 · single-user</div>
    </aside>
  );
}
