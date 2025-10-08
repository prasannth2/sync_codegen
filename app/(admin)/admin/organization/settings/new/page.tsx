"use client"

import { OrgSettingsForm } from "@/components/organization/org-settings-form"

export default function NewOrganizationSettingPage() {
    return (
        <main className="min-h-screen p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Add Setting</h1>
                <p className="text-muted-foreground">Create a new organization-level setting.</p>
            </div>
            <div className="">
                <OrgSettingsForm />
            </div>
        </main>
    )
}
