// components/sidebar/client-active-button.tsx
"use client"

import { SidebarMenuButton } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function ClientActiveButton({
    href,
    tooltip,
    children,
}: {
    href: string
    tooltip?: string
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)
    return (
        <SidebarMenuButton isActive={isActive} tooltip={tooltip} className="cursor-pointer">
            {children}
        </SidebarMenuButton>
    )
}
