// app/layout.tsx
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type React from "react"
import "./globals.css"
import { SWRConfigProvider } from "./swr-config"

// ⬇️ client shell that contains SidebarProvider & triggers
import { SidebarLayout } from "@/components/shell/sidebar-layout"

export const metadata: Metadata = {
  title: "Mapper",
  description: "Created with Fuzionest",
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`h-full overflow-hidden font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <SWRConfigProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </SWRConfigProvider>
      </body>
    </html>
  )
}
