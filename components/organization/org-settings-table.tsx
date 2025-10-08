"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string

type OrgSetting = {
    id: string
    name: string
    key: string
    value: string
    description?: string
    updatedAt?: string
}

export function OrgSettingsTable() {
    const [items, setItems] = useState<OrgSetting[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const router = useRouter()

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_BASE_URL}/api/organizations`)
                if (!res.ok) throw new Error(`Status ${res.status}`)
                const { data } = await res.json()
                setItems(data?.items ?? [])
            } catch (e) {
                // demo data fallback
                setItems([
                    {
                        id: "1",
                        name: "Region",
                        key: "region",
                        value: "us-east-1",
                        description: "Primary deployment region",
                        updatedAt: new Date().toISOString(),
                    },
                    {
                        id: "2",
                        name: "Support Email",
                        key: "support_email",
                        value: "support@example.com",
                        description: "Support contact",
                        updatedAt: new Date().toISOString(),
                    },
                ])
                toast("Using demo data for Organization Settings")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filtered = useMemo(() => {
        if (!search) return items
        const q = search.toLowerCase()
        return items.filter(
            (s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q) || s.value.toLowerCase().includes(q),
        )
    }, [items, search])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-medium">Settings</h2>
                    <p className="text-sm text-muted-foreground">List of organization-level configuration.</p>
                </div>
                <Button onClick={() => router.push("/admin/organization/settings/new")} className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Setting
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search settings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Key</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="w-[110px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No settings found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((s) => (
                                <TableRow
                                    key={s.id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/admin/organization/settings/${s.id}`)}
                                >
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{s.key}</TableCell>
                                    <TableCell className="font-mono text-xs">{s.value}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="cursor-pointer bg-transparent"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/admin/organization/settings/${s.id}`)
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
