"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Inbox, ListChecks, Users, RefreshCw, Sparkles, Target } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/strategy", label: "Strategy", icon: Target },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/gtd", label: "GTD Lists", icon: ListChecks },
  { href: "/people", label: "People", icon: Users },
  { href: "/review", label: "Weekly Review", icon: RefreshCw },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-even-navy text-white/90">
      <div className="flex items-center gap-2 px-5 py-5">
        <Sparkles className="h-5 w-5 text-even-pink" />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">What Are Next</div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">Command Center</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[10px] text-white/40">v1.0 · single-user</div>
    </aside>
  );
}
