"use client"

import {
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Building2, Database, FileCode2, ListTree, ScrollText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar() {
    const pathname = usePathname()

    const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

    return (
        <>
            <SidebarHeader className="px-3 py-2">
                <div className="flex items-center gap-2 px-1">
                    <FileCode2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Mapper Console</span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Link href="/organization/settings" className="block">
                                    <SidebarMenuButton isActive={isActive("/organization/settings")} tooltip="Organization Settings">
                                        <Building2 />
                                        <span>Organization Settings</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/functions" className="block">
                                    <SidebarMenuButton isActive={isActive("/functions")} tooltip="Functions">
                                        <ListTree />
                                        <span>Functions</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/admin/listcollection" className="block">
                                    <SidebarMenuButton isActive={isActive("/admin/listcollection")} tooltip="Database">
                                        <Database />
                                        <span>Database</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <Link href="/logs" className="block">
                                    <SidebarMenuButton isActive={isActive("/logs")} tooltip="Logs">
                                        <ScrollText />
                                        <span>Logs</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupLabel>Help</SidebarGroupLabel>
                    <SidebarGroupContent className="px-2 text-xs text-muted-foreground">
                        <p className="leading-5">Use Ctrl/Cmd + B to toggle the sidebar.</p>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="px-3 py-2">
                <div className={cn("text-xs text-muted-foreground px-1")}>v0 App • Console</div>
            </SidebarFooter>
        </>
    )
}
