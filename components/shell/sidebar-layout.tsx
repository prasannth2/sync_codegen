// components/shell/sidebar-layout.tsx
"use client";

import * as React from "react";
import { AppSidebarNav } from "@/components/sidebar/app-sidebar-nav"; // server menu (no hooks)
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

/** Storage key + helpers */
const STORAGE_KEY = "sidebar:open"; // "1" = expanded, "0" = collapsed

function readInitialOpen(): boolean {
  // default expanded if nothing stored
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {}
  return true;
}

function persistOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {}
  try {
    // 1 year cookie, useful if you later want SSR to know the preference
    document.cookie = `sidebar_open=${open ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState<boolean>(true);
  const [mounted, setMounted] = React.useState(false);

  // Read once on mount to avoid hydration mismatch flicker.
  React.useEffect(() => {
    setOpen(readInitialOpen());
    setMounted(true);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    persistOpen(next);
  };

  // Until mounted, render with an uncontrolled provider that defaults to expanded
  if (!mounted) {
    return (
      <SidebarProvider /* default expanded while hydrating */
        defaultOpen
      >
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar collapsible="icon" className="h-full overflow-y-auto">
            <div className="py-2">
              <div className="flex items-center gap-2 px-1">
                <SidebarTrigger className="mr-1 h-8 w-8 cursor-pointer" />
              </div>
            </div>
            <AppSidebarNav />
          </Sidebar>

          <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden">
            <main id="root" className="flex-1 overflow-auto bg-background">
              {children}
            </main>
            <Toaster richColors />
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Mounted: controlled provider that persists state
  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar collapsible="icon" className="h-full overflow-y-auto">
          {/* Header with trigger (client) + server-rendered nav groups */}
          <div className="py-2">
            <div className="flex items-center gap-2 px-1">
              <SidebarTrigger className="mr-1 h-8 w-8 cursor-pointer" />
            </div>
          </div>

          {/* Server menu content */}
          <AppSidebarNav />

          {/* Slim rail placeholder if your UI kit has one */}
          {/* <SidebarRail /> */}
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden">
          <main id="root" className="flex-1 overflow-auto bg-background">
            {children}
          </main>
          <Toaster richColors />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}