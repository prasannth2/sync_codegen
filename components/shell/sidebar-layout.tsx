// components/shell/sidebar-layout.tsx
"use client"

import { AppSidebarNav } from "@/components/sidebar/app-sidebar-nav"; // server menu (no hooks)
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden">
                <Sidebar collapsible="icon" className="h-full overflow-y-auto">
                    {/* Header with trigger (client) + server-rendered nav groups */}
                    <div className="py-2">
                        <div className="flex items-center gap-2 px-1">
                            <SidebarTrigger className="mr-1 h-8 w-8 cursor-pointer" />
                            {/* <span className="text-sm font-semibold">Mapper Console</span> */}
                        </div>
                    </div>

                    {/* Server menu content */}
                    <AppSidebarNav />

                    {/* Slim rail with its own trigger (no children!) */}
                    {/* If your sidebar UI library provides SidebarRail, use it here */}
                    {/* <SidebarRail /> */}
                </Sidebar>

                <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Optional topbar trigger (client) */}
                    {/* <div className="flex items-center gap-2 p-2 border-b">
                        <SidebarTrigger className="h-8 w-8" />
                        <h1 className="font-semibold">Your App</h1>
                    </div> */}

                    <main id="root" className="flex-1 overflow-auto bg-background">
                        {children}
                    </main>

                    <Toaster richColors />
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}
