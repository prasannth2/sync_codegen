"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { z } from "zod"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string

type Frequency = "every-x-minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom"

export interface ScheduleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "edit"
    formatterId: string
    scheduleId?: string
    initial?: {
        name?: string
        key?: string
        description?: string
        cron?: string
        timezone?: string
        isEnabled?: boolean
    }
    onSaved?: (result: { schedule_id: string; status?: string }) => void
}

/* ---------- Schema helpers ---------- */
const optNum = () =>
    z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
        .refine((v) => v === undefined || !isNaN(v), { message: "Invalid number" })

const schema = z
    .object({
        name: z.string().min(2, "Please enter a name"),
        key: z.string().min(2, "Please enter a key"),
        description: z.string().optional(),
        frequency: z.custom<Frequency>().refine(Boolean, "Select a frequency"),
        everyMinutes: optNum().refine((v) => v === undefined || (v >= 1 && v <= 59), {
            message: "Enter minutes between 1 and 59",
        }),
        minute: optNum().refine((v) => v === undefined || (v >= 0 && v <= 59), {
            message: "Minute must be 0–59",
        }),
        hour: optNum().refine((v) => v === undefined || (v >= 0 && v <= 23), {
            message: "Hour must be 0–23",
        }),
        dayOfMonth: optNum().refine((v) => v === undefined || (v >= 1 && v <= 31), {
            message: "Day must be 1–31",
        }),
        dayOfWeek: z
            .string()
            .optional()
            .refine((v) => v === undefined || ["0", "1", "2", "3", "4", "5", "6"].includes(v), {
                message: "Invalid day of week",
            }),
        customCron: z.string().optional(),
        timezone: z.string().default("UTC"),
        isEnabled: z.boolean().default(false),
    })
    .superRefine((val, ctx) => {
        switch (val.frequency) {
            case "every-x-minutes":
                if (val.everyMinutes === undefined) ctx.addIssue({ code: "custom", message: "Minutes required", path: ["everyMinutes"] })
                break
            case "hourly":
                if (val.minute === undefined) ctx.addIssue({ code: "custom", message: "Minute required", path: ["minute"] })
                break
            case "daily":
                if (val.hour === undefined) ctx.addIssue({ code: "custom", message: "Hour required", path: ["hour"] })
                if (val.minute === undefined) ctx.addIssue({ code: "custom", message: "Minute required", path: ["minute"] })
                break
            case "weekly":
                if (val.hour === undefined) ctx.addIssue({ code: "custom", message: "Hour required", path: ["hour"] })
                if (val.minute === undefined) ctx.addIssue({ code: "custom", message: "Minute required", path: ["minute"] })
                if (!val.dayOfWeek) ctx.addIssue({ code: "custom", message: "Day required", path: ["dayOfWeek"] })
                break
            case "monthly":
                if (val.dayOfMonth === undefined) ctx.addIssue({ code: "custom", message: "Day required", path: ["dayOfMonth"] })
                if (val.hour === undefined) ctx.addIssue({ code: "custom", message: "Hour required", path: ["hour"] })
                if (val.minute === undefined) ctx.addIssue({ code: "custom", message: "Minute required", path: ["minute"] })
                break
            case "custom":
                if (!val.customCron?.trim()) ctx.addIssue({ code: "custom", message: "Cron required", path: ["customCron"] })
                break
        }
    })

type FormValues = z.infer<typeof schema>

/* ---------- Helpers ---------- */
function buildCron(values: FormValues): string {
    switch (values.frequency) {
        case "every-x-minutes":
            return `*/${values.everyMinutes ?? 5} * * * *`
        case "hourly":
            return `${values.minute ?? 0} * * * *`
        case "daily":
            return `${values.minute ?? 0} ${values.hour ?? 0} * * *`
        case "weekly":
            return `${values.minute ?? 0} ${values.hour ?? 0} * * ${values.dayOfWeek ?? "0"}`
        case "monthly":
            return `${values.minute ?? 0} ${values.hour ?? 0} ${values.dayOfMonth ?? 1} * *`
        case "custom":
            return values.customCron?.trim() || "*/5 * * * *"
        default:
            return "*/5 * * * *"
    }
}

const createDefaults: FormValues = {
    name: "New Schedule",
    key: "new_schedule",
    description: "",
    frequency: "every-x-minutes",
    customCron: "",
    timezone: "UTC",
    isEnabled: false,
    everyMinutes: 5,
    minute: 0,
    hour: 0,
    dayOfMonth: 1,
    dayOfWeek: "0",
}

export function ScheduleDialog(props: ScheduleDialogProps) {
    const { open, onOpenChange, mode, formatterId, initial, onSaved, scheduleId } = props

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: createDefaults,
    })

    const { control, reset, handleSubmit, watch, setValue } = form
    const frequency = watch("frequency")

    /* ---------- Create-mode hydrate on open ---------- */
    useEffect(() => {
        if (!open) return
        if (mode === "create") {
            reset({
                ...createDefaults,
                name: initial?.name ?? createDefaults.name,
                key: initial?.key ?? createDefaults.key,
                description: initial?.description ?? "",
                frequency: initial?.cron ? "custom" : "every-x-minutes",
                customCron: initial?.cron ?? "",
                timezone: initial?.timezone ?? "UTC",
                isEnabled: initial?.isEnabled ?? false,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode])

    /* ---------- Edit-mode fetch + hydrate ---------- */
    useEffect(() => {
        if (!open || mode !== "edit" || !scheduleId) return
            ; (async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/schedules/${scheduleId}`)
                    if (!res.ok) throw new Error(`Failed to load schedule (${res.status})`)
                    const json = await res.json()
                    const data = json?.data ?? json ?? {}

                    // Be defensive about shapes
                    const schedule = data.schedule ?? {}
                    const cron: string = schedule.cron ?? data.cron ?? ""
                    const timezone: string = schedule.timezone ?? data.timezone ?? "UTC"

                    const name: string = data.name ?? schedule.name ?? ""
                    const key: string = data.key ?? schedule.key ?? ""
                    const description: string = data.description ?? schedule.description ?? ""
                    const enabled: boolean =
                        typeof data.enabled === "boolean"
                            ? data.enabled
                            : typeof schedule.enabled === "boolean"
                                ? schedule.enabled
                                : false

                    reset({
                        name,
                        key,
                        description,
                        frequency: cron ? "custom" : "every-x-minutes",
                        customCron: cron || "",
                        timezone,
                        isEnabled: enabled,
                        everyMinutes: cron?.startsWith("*/") ? Number(cron.split("*/")[1]?.split(" ")[0]) || 5 : 5,
                        minute: 0,
                        hour: 0,
                        dayOfMonth: 1,
                        dayOfWeek: "0",
                    })
                } catch (err) {
                    console.error("❌ Hydration failed", err)
                    toast({ title: "Failed to load schedule", variant: "destructive" })
                }
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode, scheduleId])

    const onSubmit = async (values: FormValues) => {
        const isEdit = mode === "edit" && !!scheduleId
        const cron = buildCron(values)

        try {
            const payload = {
                formatter_id: formatterId,
                isEnabled: values.isEnabled ?? false,
                enabled: values.isEnabled ?? false,
                key: values.key,
                name: values.name,
                description: values.description ?? "",
                schedule: {
                    mode: "cron",
                    cron,
                    timezone: values.timezone || "UTC",
                    jitter_ms: 0,
                    misfire_policy: "fire_now",
                    catch_up_limit: 5,
                },
                concurrency: { policy: "allow", max_running: 1, dedupe_key: null },
                payload_template: { params: { dbUri: "mongodb://localhost:27017/tradingai" }, context: {}, headers: {}, vars: {} },
                tags: [],
            }

            const endpoint = isEdit
                ? `${API_BASE_URL}/api/schedules/${scheduleId}`
                : `${API_BASE_URL}/api/schedule-function/${formatterId}/schedule`
            const method = isEdit ? "PATCH" : "POST"

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg || (isEdit ? "Failed to update schedule" : "Failed to create schedule"))
            }

            const data = await res.json().catch(() => ({}))
            const savedId = data?.data?._id || data?._id || data?.id || scheduleId || ""

            toast({
                title: isEdit ? "Schedule updated" : "Schedule created",
                description: `Cron: ${cron}`,
            })

            onOpenChange(false)
            onSaved?.({ schedule_id: savedId, status: values.isEnabled ? "scheduled" : "idle" })
        } catch (e: any) {
            toast({
                title: isEdit ? "Update failed" : "Create failed",
                description: e?.message ?? "",
                variant: "destructive",
            })
        }
    }

    const cronPreview = useMemo(() => buildCron(form.getValues()), [frequency])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <FormProvider {...form}>
                    <form
                        onSubmit={handleSubmit(
                            onSubmit,
                            (errors) => {
                                console.log("❌ Validation errors:", errors)
                                toast({
                                    title: "Form validation failed",
                                    description: "Check console for details",
                                    variant: "destructive",
                                })
                            }
                        )}
                        className="space-y-6"
                    >
                        <DialogHeader>
                            <DialogTitle>Schedule Configuration</DialogTitle>
                            <DialogDescription>Configure when this function should run.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                            {/* Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Controller
                                    control={control}
                                    name="name"
                                    render={({ field }) => <Input id="name" placeholder="BTCUSDT 1m sync (every 5m)" {...field} />}
                                />
                            </div>

                            {/* Key */}
                            <div className="grid gap-2">
                                <Label htmlFor="key">Key</Label>
                                <Controller
                                    control={control}
                                    name="key"
                                    render={({ field }) => <Input id="key" placeholder="btc_1m_sync" {...field} />}
                                />
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Description</Label>
                                <Controller
                                    control={control}
                                    name="description"
                                    render={({ field }) => <Input id="desc" placeholder="Describe what this schedule does" {...field} />}
                                />
                            </div>

                            {/* Frequency */}
                            <div className="grid gap-2">
                                <Label>Frequency</Label>
                                <Controller
                                    control={control}
                                    name="frequency"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="every-x-minutes">Every X Minutes</SelectItem>
                                                <SelectItem value="hourly">Hourly</SelectItem>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="custom">Custom Cron</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Every X Minutes */}
                            {watch("frequency") === "every-x-minutes" && (
                                <div className="grid gap-2">
                                    <Label htmlFor="everyMinutes">Every</Label>
                                    <Controller
                                        control={control}
                                        name="everyMinutes"
                                        render={({ field }) => (
                                            <Input id="everyMinutes" type="number" min={1} max={59} placeholder="5" {...field} />
                                        )}
                                    />
                                </div>
                            )}

                            {/* Hourly */}
                            {watch("frequency") === "hourly" && (
                                <div className="grid gap-2">
                                    <Label htmlFor="minute">Minute (0–59)</Label>
                                    <Controller
                                        control={control}
                                        name="minute"
                                        render={({ field }) => <Input id="minute" type="number" min={0} max={59} placeholder="0" {...field} />}
                                    />
                                </div>
                            )}

                            {/* Daily */}
                            {watch("frequency") === "daily" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="hour">Hour (0–23)</Label>
                                        <Controller
                                            control={control}
                                            name="hour"
                                            render={({ field }) => <Input id="hour" type="number" min={0} max={23} placeholder="0" {...field} />}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="minute">Minute (0–59)</Label>
                                        <Controller
                                            control={control}
                                            name="minute"
                                            render={({ field }) => <Input id="minute" type="number" min={0} max={59} placeholder="0" {...field} />}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Weekly */}
                            {watch("frequency") === "weekly" && (
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="hour">Hour</Label>
                                            <Controller
                                                control={control}
                                                name="hour"
                                                render={({ field }) => <Input id="hour" type="number" min={0} max={23} placeholder="0" {...field} />}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="minute">Minute</Label>
                                            <Controller
                                                control={control}
                                                name="minute"
                                                render={({ field }) => <Input id="minute" type="number" min={0} max={59} placeholder="0" {...field} />}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Day of Week</Label>
                                        <Controller
                                            control={control}
                                            name="dayOfWeek"
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">Sunday</SelectItem>
                                                        <SelectItem value="1">Monday</SelectItem>
                                                        <SelectItem value="2">Tuesday</SelectItem>
                                                        <SelectItem value="3">Wednesday</SelectItem>
                                                        <SelectItem value="4">Thursday</SelectItem>
                                                        <SelectItem value="5">Friday</SelectItem>
                                                        <SelectItem value="6">Saturday</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Monthly */}
                            {watch("frequency") === "monthly" && (
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="dayOfMonth">Day of Month</Label>
                                            <Controller
                                                control={control}
                                                name="dayOfMonth"
                                                render={({ field }) => (
                                                    <Input id="dayOfMonth" type="number" min={1} max={31} placeholder="1" {...field} />
                                                )}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="hour">Hour</Label>
                                            <Controller
                                                control={control}
                                                name="hour"
                                                render={({ field }) => <Input id="hour" type="number" min={0} max={23} placeholder="0" {...field} />}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="minute">Minute</Label>
                                            <Controller
                                                control={control}
                                                name="minute"
                                                render={({ field }) => <Input id="minute" type="number" min={0} max={59} placeholder="0" {...field} />}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Cron */}
                            {watch("frequency") === "custom" && (
                                <div className="grid gap-2">
                                    <Label htmlFor="cron">Cron Expression</Label>
                                    <Controller
                                        control={control}
                                        name="customCron"
                                        render={({ field }) => <Input id="cron" placeholder="*/5 * * * *" {...field} />}
                                    />
                                </div>
                            )}

                            {/* Timezone */}
                            <div className="grid gap-2">
                                <Label>Timezone</Label>
                                <Controller
                                    control={control}
                                    name="timezone"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="UTC" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UTC">UTC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Cron Preview */}
                            <div className="text-xs text-muted-foreground">
                                Cron preview: <span className="font-mono">{cronPreview}</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button className="cursor-pointer" type="submit">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}

export default ScheduleDialog
