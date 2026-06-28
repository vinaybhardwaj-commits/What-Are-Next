import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Capture } from "@/components/capture";
import { CommandPalette } from "@/components/command-palette";
import { Assistant } from "@/components/assistant";
import { getCommandIndex } from "@/lib/strategy";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const index = await getCommandIndex();
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="grid-bg flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <MobileNav />
      <Capture />
      <CommandPalette index={index} />
      <Assistant />
    </div>
  );
}
