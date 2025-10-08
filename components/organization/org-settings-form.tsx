"use client"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string

const SettingSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    key: z
        .string()
        .min(2, "Key must be at least 2 characters")
        .regex(/^[a-z0-9_.:-]+$/i, "Only alphanumerics, _, ., :, -"),
    value: z.string().min(1, "Value is required"),
    description: z.string().optional(),
})

type SettingValues = z.infer<typeof SettingSchema>

export function OrgSettingsForm({ initialValues }: { initialValues?: Partial<SettingValues> }) {
    const router = useRouter()
    const form = useForm<SettingValues>({
        resolver: zodResolver(SettingSchema),
        defaultValues: {
            name: "",
            key: "",
            value: "",
            description: "",
            ...initialValues,
        },
        mode: "onChange",
    })

    const isEdit = Boolean(initialValues?.id)

    const onSubmit = async (values: SettingValues) => {
        try {
            const res = await fetch(
                isEdit ? `${API_BASE_URL}/api/organizations/${values.id}` : `${API_BASE_URL}/api/organizations`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                },
            )
            if (!res.ok) throw new Error(`Failed: ${res.status}`)
            toast.success(isEdit ? "Setting updated" : "Setting created")
            router.push("/organization/settings")
        } catch (e) {
            toast.error("Unable to save setting. Please try again.")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g., Region" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="key"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Key</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g., region" className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="e.g., us-east-1" className="font-mono" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea {...field} placeholder="Describe what this setting controls" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/organization/settings")}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button type="submit" className="cursor-pointer">
                        {isEdit ? "Save Changes" : "Create Setting"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
