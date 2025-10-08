// components/sidebar/app-sidebar-nav.tsx
import {
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { Building2, Database, ListTree, ScrollText } from "lucide-react";
import Link from "next/link";
import { ClientActiveButton } from "./client-active-button"; // tiny client leaf

export function AppSidebarNav() {
    return (
        <>
            <SidebarHeader className="px-3 py-2">
                {/* You can put a static logo here; no hooks */}
            </SidebarHeader>

            <SidebarContent className="overflow-x-hidden">
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Link href="/admin/organization/settings" className="block">
                                    <ClientActiveButton href="/admin/organization/settings" tooltip="Organization Settings">
                                        <Building2 />
                                        <span>Organization Settings</span>
                                    </ClientActiveButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/functions" className="block">
                                    <ClientActiveButton href="/functions" tooltip="Functions">
                                        <ListTree />
                                        <span>Functions</span>
                                    </ClientActiveButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/admin/listcollection" className="block">
                                    <ClientActiveButton href="/admin/listcollection" tooltip="Database">
                                        <Database />
                                        <span>Database</span>
                                    </ClientActiveButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/workflow-logs" className="block">
                                    <ClientActiveButton href="/workflow-logs" tooltip="Logs">
                                        <ScrollText />
                                        <span>Logs</span>
                                    </ClientActiveButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                {/* <SidebarGroup>
                    <SidebarGroupLabel>Help</SidebarGroupLabel>
                    <SidebarGroupContent className="px-2 text-xs text-muted-foreground">
                        <p>Click the menu icon or use Ctrl/Cmd + B to toggle the sidebar.</p>
                    </SidebarGroupContent>
                </SidebarGroup> */}
            </SidebarContent>

            {/* <SidebarFooter className="px-3 py-2">
                <div className={cn("text-xs text-muted-foreground px-1")}>v0 App • Console</div>
            </SidebarFooter> */}
        </>
    )
}
