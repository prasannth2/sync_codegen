"use client"

import { OrgSettingsForm } from "@/components/organization/org-settings-form"
import { useEffect, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string

export default function EditOrganizationSettingPage({ params }: { params: { id: string } }) {
    const [initialData, setInitialData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/organizations/${params.id}`)
                if (!res.ok) throw new Error(`Failed: ${res.status}`)
                const { data } = await res.json()
                setInitialData(data)
            } catch {
                // demo fallback
                setInitialData({
                    id: params.id,
                    name: "Default Setting",
                    key: "default_key",
                    value: "on",
                    description: "Sample description",
                })
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [params.id])

    return (
        <main className="min-h-screen p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Edit Setting</h1>
                <p className="text-muted-foreground">Update an existing organization-level setting.</p>
            </div>
            <div className="">
                {loading ? (
                    <div className="text-muted-foreground">Loading setting...</div>
                ) : (
                    <OrgSettingsForm initialValues={initialData} />
                )}
            </div>
        </main>
    )
}
