// components/app-sidebar.tsx
"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Building2, Database, FileCode2, ListTree, ScrollText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar() {
    const pathname = usePathname()
    const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

    return (
        <Sidebar collapsible="icon">{/* <-- IMPORTANT root wrapper */}
            <SidebarHeader className="px-3 py-2">
                <div className="flex items-center gap-2 px-1">
                    <SidebarTrigger className="-ml-1 mr-1 h-8 w-8" />
                    <FileCode2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Mapper Console</span>
                </div>
            </SidebarHeader>

            <SidebarContent className="overflow-x-hidden">
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Link href="/admin/organization/settings" className="block">
                                    <SidebarMenuButton isActive={isActive("/admin/organization/settings")} className="cursor-pointer">
                                        <Building2 />
                                        <span>Organization Settings</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/functions" className="block">
                                    <SidebarMenuButton isActive={isActive("/functions")} className="cursor-pointer">
                                        <ListTree />
                                        <span>Functions</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/admin/listcollection" className="block">
                                    <SidebarMenuButton isActive={isActive("/admin/listcollection")} className="cursor-pointer">
                                        <Database />
                                        <span>Database</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/workflow-logs" className="block">
                                    <SidebarMenuButton isActive={isActive("/workflow-logs")} className="cursor-pointer">
                                        <ScrollText />
                                        <span>Logs</span>
                                    </SidebarMenuButton>
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

            <SidebarFooter className="px-3 py-2">
                <div className={cn("text-xs text-muted-foreground px-1")}>v0 App • Console</div>
            </SidebarFooter>

            {/* IMPORTANT: use SidebarRail with NO children */}
            <SidebarRail />
        </Sidebar>
    )
}
