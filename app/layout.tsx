import { AppSidebar } from "@/components/app-sidebar"
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type React from "react"
import "./globals.css"
import { SWRConfigProvider } from "./swr-config"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`h-full overflow-hidden font-sans ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <SWRConfigProvider>
          <SidebarProvider>
            {/* Main layout */}
            <div className="flex h-screen w-full overflow-hidden">
              <Sidebar className="h-full overflow-y-auto">
                <AppSidebar />
              </Sidebar>

              {/* Main content area */}
              <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden">
                <main
                  id="root"
                  className="flex-1 overflow-auto bg-background"
                >
                  {children}
                </main>

                <Toaster richColors />
              </SidebarInset>
            </div>
          </SidebarProvider>
        </SWRConfigProvider>
      </body>
    </html>
  )
}


