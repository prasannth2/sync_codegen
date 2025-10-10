"use client"

import ScheduleDialog from "@/components/schedules/schedule-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader } from "@/components/ui/Loader"
import { toast } from "@/hooks/use-toast"
import { CalendarPlus, Clock7, Pencil, Play, Plus, Search, Settings2, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string

interface FunctionItem {
  api_id: string
  name: string
  key: string
  description?: string
  formatter_id?: string
  schedule_id?: string | null
  schedule_status?: CanonicalScheduleStatus
  owner?: string
  users_count?: number
  stars?: number
}


type CanonicalScheduleStatus = "running" | "scheduled" | "idle"

function normalizeStatus(raw: string | undefined, hasId: boolean): CanonicalScheduleStatus {
  const v = (raw || "").toLowerCase()
  if (["enabled", "running", "active", "on"].includes(v)) return "running"
  if (["disabled", "stopped", "idle"].includes(v)) return "idle"
  if (["scheduled", "pending"].includes(v)) return "scheduled"
  // fallback: if it has a schedule_id but no clear status, treat as scheduled
  return hasId ? "scheduled" : "idle"
}


export function FunctionsList() {
  const [formatters, setFormatters] = useState<FunctionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [currentItem, setCurrentItem] = useState<FunctionItem | null>(null)


  const fetchFormatters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/formatters`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const { data } = await res.json()
      const items = (data?.formatters || []).map((x: any) => {
        const hasId = !!x.schedule_id
        return {
          ...x,
          schedule_id: x.schedule_id ?? null,
          schedule_status: normalizeStatus(x.schedule_status, hasId),
          owner: x.owner ?? "unknown",
          users_count: x.users_count ?? 1,
          stars: x.stars ?? 0,
        } as FunctionItem
      })

      setFormatters(items)
    } catch (error) {
      console.error("Failed to fetch formatters:", error)
      toast({
        title: "Error",
        description: "Could not load available functions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])


  useEffect(() => {
    fetchFormatters()
  }, [fetchFormatters])


  const filtered = useMemo(() => {
    if (!searchQuery) return formatters
    const q = searchQuery.toLowerCase()
    return formatters.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) || f.key?.toLowerCase().includes(q) || f.api_id?.toLowerCase().includes(q),
    )
  }, [formatters, searchQuery])

  const startSchedule = async (item: FunctionItem) => {
    if (!item.formatter_id || !item.schedule_id) return
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/schedules/${item.schedule_id}/enable`,
        { method: "POST" },
      )


      if (!res.ok) throw new Error("Failed to start schedule")
      toast({ title: "Schedule started" })
      setFormatters((prev) =>
        prev.map((f) => (f.formatter_id === item.formatter_id ? { ...f, schedule_status: "running" } : f)),
      )
    } catch {
      toast({ title: "Failed to start", variant: "destructive" })
    }
  }

  const stopSchedule = async (item: FunctionItem) => {
    if (!item.formatter_id || !item.schedule_id) return
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/schedules/${item.schedule_id}/disable`,
        { method: "POST" },
      )
      if (!res.ok) throw new Error("Failed to stop schedule")
      toast({ title: "Schedule stopped" })
      setFormatters((prev) =>
        prev.map((f) => (f.formatter_id === item.formatter_id ? { ...f, schedule_status: "idle" } : f)),
      )
    } catch {
      toast({ title: "Failed to stop", variant: "destructive" })
    }
  }

  const openCreateSchedule = (item: FunctionItem) => {
    if (!item.formatter_id) {
      toast({ title: "Missing formatter id", variant: "destructive" })
      return
    }
    setCurrentItem(item)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const openEditSchedule = (item: FunctionItem) => {
    setCurrentItem(item)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const statusBadge = (s?: FunctionItem["schedule_status"]) => {
    if (s === "running")
      return (
        <Badge variant="secondary" className="bg-green-500/15 text-green-600">
          Running
        </Badge>
      )
    if (s === "scheduled")
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
          Scheduled
        </Badge>
      )
    if (s === "idle")
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-600">
          Idle
        </Badge>
      )
    return (
      <Badge variant="secondary" className="bg-foreground/10 text-foreground">
        Stopped
      </Badge>
    )
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Functions</h1>
          <p className="text-muted-foreground">Manage your data functions and transformations</p>
        </div>
        <Button onClick={() => router.push("/functions/new")} className="cursor-pointer flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Function
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search functions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted" />
          <h3 className="mt-4 text-lg font-semibold">
            {searchQuery ? "No functions found" : "No functions available"}
          </h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {searchQuery ? "Try different search terms." : "Get started by creating your first function."}
          </p>
          {!searchQuery && (
            <Button onClick={() => router.push("/functions/new")} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create Function
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const showStart = !!item.schedule_id && item.schedule_status !== "running"
            const showStop = !!item.schedule_id && item.schedule_status === "running"
            return (
              <Card
                key={item.formatter_id ?? item.api_id}
                className="relative overflow-visible p-2"
              >
                <div className="flex">
                  <div className="flex-1 p-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded border text-xs">
                          📄
                        </span>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.key}</div>
                        </div>
                      </div>
                    </div>


                    <CardContent className="p-0 mt-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description ?? "No description provided."}
                      </p>

                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center gap-2">
                          <Clock7 className="h-4 w-4 text-muted-foreground" />
                          {statusBadge(item.schedule_status)}
                        </div>

                        <Button
                          variant="ghost"
                          className="rounded-full cursor-pointer bg-foreground/5 hover:bg-foreground/10"
                          onClick={() => router.push(`/functions/${item.formatter_id}`)}
                          title="Edit"
                        >
                          Edit <Pencil className="h-2 w-2" size="16" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </CardContent>
                  </div>

                  {/* Right action rail */}
                  <div className="flex flex-col items-center justify-stretch gap-2 border-l p-2 min-w-[44px]">
                    {!item.schedule_id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => openCreateSchedule(item)}
                        title="Create schedule"
                      >
                        <CalendarPlus className="h-4 w-4 text-green-600" />
                      </Button>
                    ) : (
                      <>
                        {showStart && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => startSchedule(item)}
                            title="Start"
                          >
                            <Play className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {showStop && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => stopSchedule(item)}
                            title="Stop"
                          >
                            <Square className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => openEditSchedule(item)}
                          title="Edit schedule"
                        >
                          <Settings2 className="h-4 w-4 text-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ScheduleDialog
        key={`${dialogMode}-${currentItem?.formatter_id ?? "new"}`}   // <-- add this
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            // optional: clear context so next open starts clean
            setCurrentItem(null)
            setDialogMode("create")
          }
        }}
        mode={dialogMode}
        formatterId={currentItem?.formatter_id ?? ""}                 // ensure this exists for create
        scheduleId={currentItem?.schedule_id ?? undefined}
        initial={
          dialogMode === "edit"
            ? {
              name: `${currentItem?.name ?? ""} schedule`,
              key: `${currentItem?.key ?? ""}_sync`,
              description: currentItem?.description ?? "",
              cron: undefined,
              timezone: "UTC",
              isEnabled:
                currentItem?.schedule_status === "running" ||
                currentItem?.schedule_status === "scheduled",
            }
            : undefined
        }
        onSaved={async ({ schedule_id, status }) => {
          if (!currentItem?.formatter_id) return

          // optimistic update (keeps UI snappy)
          setFormatters((prev) =>
            prev.map((f) =>
              f.formatter_id === currentItem.formatter_id
                ? { ...f, schedule_id, schedule_status: status as any }
                : f,
            ),
          )

          // if it was CREATE, refresh the full list from server as you asked
          if (dialogMode === "create") {
            await fetchFormatters()
          }
        }}

      />

    </div>
  )
}
