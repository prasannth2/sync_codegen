"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;

interface Formatter {
    api_id: string
    name: string
    key: string
    description?: string
    formatter_id?: string
}

export function FormatterList() {
    const [formatters, setFormatters] = useState<Formatter[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    useEffect(() => {
        const fetchFormatters = async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API_BASE_URL}/api/formatters`)
                if (!res.ok) throw new Error(`API error: ${res.status}`)
                const {data} = await res.json()
                setFormatters(data?.formatters || [])
            } catch (error) {
                console.error("Failed to fetch formatters:", error)
                toast({
                    title: "Error",
                    description: "Could not load available formatters.",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchFormatters()
    }, [])

    const filteredFormatters = useMemo(() => {
        if (!searchQuery) return formatters

        return formatters.filter(
            (formatter) =>
                formatter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                formatter.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                formatter.api_id.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    }, [formatters, searchQuery])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-muted-foreground">Loading formatters...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Formatters</h1>
                    <p className="text-muted-foreground">Manage your data formatters and transformations</p>
                </div>
                <Button onClick={() => router.push("/mapper")} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Formatter
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search formatters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {filteredFormatters.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                        {searchQuery ? "No formatters found" : "No formatters available"}
                    </h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {searchQuery
                            ? "Try adjusting your search terms or clear the search to see all formatters."
                            : "Get started by creating your first formatter."}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => router.push("/mapper")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Formatter
                        </Button>
                    )}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>API ID</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFormatters.map((fmt) => (
                                <TableRow
                                    key={fmt.formatter_id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/mapper?formatter_id=${fmt.api_id}`)}
                                >
                                    <TableCell className="font-medium">{fmt.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{fmt.key}</TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">{fmt.api_id}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/mapper?formatter_id=${fmt.formatter_id}&api_id=${fmt.api_id}`)
                                            }}
                                        >
                                            Open
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {searchQuery && filteredFormatters.length > 0 && (
                <p className="text-sm text-muted-foreground">
                    Showing {filteredFormatters.length} of {formatters.length} formatters
                </p>
            )}
        </div>
    )
}
