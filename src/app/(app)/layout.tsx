import { AppSidebar } from "@/components/app-sidebar";
import { Capture } from "@/components/capture";
import { CommandPalette } from "@/components/command-palette";
import { getCommandIndex } from "@/lib/strategy";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const index = await getCommandIndex();
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-even-surface">{children}</main>
      <Capture />
      <CommandPalette index={index} />
    </div>
  );
}
