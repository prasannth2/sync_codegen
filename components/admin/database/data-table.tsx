"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eye,
  MoreHorizontal,
  Search,
  SortAsc,
  SortDesc
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { AdvancedFilters } from "./advanced-filters"
import { ColumnSelector } from "./selector"
import { UniversalCell } from "./UniversalCell"

type Doc = Record<string, any>

interface FilterCondition {
  id: string
  field: string
  operator: string
  value: any
  type: "string" | "number" | "boolean" | "date" | "null"
}

interface DataTableProps {
  data: Doc[]
  total: number
  isLoading?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  currentPage?: number
  pageSize?: number
}

/** Recursively flatten object keys (dot notation) */
function flattenKeys(obj: Doc, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return []
  return Object.entries(obj).flatMap(([k, v]) => {
    const newKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      return flattenKeys(v, newKey)
    }
    return [newKey]
  })
}

/** Get nested value by dot notation */
function getValue(obj: Doc, path: string): any {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

export function DataTable({
  data,
  total,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  currentPage = 1,
  pageSize = 20,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"table" | "json">("table")
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [expandedCell, setExpandedCell] = useState<{ row: number; col: string } | null>(null)

  // Get all unique keys from the data
  const allKeys = useMemo(() => {
    const keys = Array.from(new Set(data.flatMap((doc) => flattenKeys(doc))))
    // Prioritize common fields
    const priorityFields = ["_id", "name", "email", "status", "createdAt", "updatedAt"]
    const sortedKeys = keys.sort((a, b) => {
      const aIndex = priorityFields.indexOf(a)
      const bIndex = priorityFields.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
    return sortedKeys
  }, [data])

  // Initialize selected columns with first 6 fields
  useEffect(() => {
    if (allKeys.length > 0) {
      // ✅ always reset columns when new collection/schema loads
      setSelectedColumns(allKeys)
    } else {
      setSelectedColumns([])
    }
  }, [allKeys])



  // Apply advanced filters to data
  const applyAdvancedFilters = (docs: Doc[], filters: FilterCondition[]): Doc[] => {
    if (filters.length === 0) return docs

    return docs.filter((doc) => {
      return filters.every((filter) => {
        const value = getValue(doc, filter.field)

        switch (filter.operator) {
          case "$eq":
            return value === filter.value
          case "$ne":
            return value !== filter.value
          case "$gt":
            return value > filter.value
          case "$gte":
            return value >= filter.value
          case "$lt":
            return value < filter.value
          case "$lte":
            return value <= filter.value
          case "$regex":
            return value && value.toString().toLowerCase().includes(filter.value.toLowerCase())
          case "$in":
            return Array.isArray(filter.value) && filter.value.includes(value)
          case "$nin":
            return Array.isArray(filter.value) && !filter.value.includes(value)
          case "$exists":
            return filter.value ? value !== null && value !== undefined : value === null || value === undefined
          default:
            return true
        }
      })
    })
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply advanced filters first
    filtered = applyAdvancedFilters(filtered, advancedFilters)

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((doc) => JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = getValue(a, sortField)
        const bVal = getValue(b, sortField)

        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        const comparison = aVal < bVal ? -1 : 1
        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, sortField, sortDirection, advancedFilters])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleAdvancedFiltersChange = (filters: FilterCondition[]) => {
    setAdvancedFilters(filters)
  }

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters([])
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return ""
    if (typeof value === "object") return JSON.stringify(value)
    if (typeof value === "boolean") return value.toString()
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 50) + "..."
    }
    return String(value)
  }

  const getValueType = (value: any): string => {
    if (value === null || value === undefined) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const totalPages = Math.ceil(total / pageSize)
  const displayedColumns = selectedColumns.length > 0 ? selectedColumns : allKeys.slice(0, 6)
  const hasActiveFilters = searchTerm || advancedFilters.length > 0

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 rounded"
            />
          </div>

          <AdvancedFilters
            availableFields={allKeys}
            onFiltersChange={handleAdvancedFiltersChange}
            onClearFilters={handleClearAdvancedFilters}
          />

          <Select value={viewMode} onValueChange={(value: "table" | "json") => setViewMode(value)}>
            <SelectTrigger className="w-32 rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded">
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary rounded">
            {processedData.length} of {total} documents
            {hasActiveFilters && " (filtered)"}
          </Badge>

          <ColumnSelector
            allKeys={allKeys}
            selectedColumns={selectedColumns}
            onChange={setSelectedColumns}
          />


        </div>
      </div>

      {/* Data Display */}

      {viewMode === "table" ? (
        <div className="border rounded">

          <div className="max-h-[600px] overflow-x-auto overflow-y-auto">

            <Table className="min-w-[1500px] table-auto">
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow className="border-border">
                  {displayedColumns.map((key) => (
                    <TableHead
                      key={key}
                      className="font-medium text-foreground border-r border-border last:border-r-0 min-w-[120px]"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 font-medium hover:bg-accent"
                        onClick={() => handleSort(key)}
                      >
                        <span className="font-mono text-xs">{key}</span>
                        {sortField === key ? (
                          sortDirection === "asc" ? (
                            <SortAsc className="ml-1 h-3 w-3" />
                          ) : (
                            <SortDesc className="ml-1 h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={displayedColumns.length + 1} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span className="ml-2 text-muted-foreground">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={displayedColumns.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {hasActiveFilters ? "No documents match your filters" : "No documents found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  processedData.map((doc, index) => (
                    <TableRow key={index} className="border-border hover:bg-muted/30 group">
                      {displayedColumns.map((key) => {
                        const value = getValue(doc, key)
                        const valueType = getValueType(value)
                        return (
                          <TableCell
                            key={key}
                            className="border-r border-border last:border-r-0 font-mono text-sm max-w-[250px] overflow-hidden align-top"
                          >
                            <div className="truncate break-words whitespace-pre-wrap">
                              <UniversalCell
                                value={value}
                                isId={key === "_id"}
                                expanded={expandedCell?.row === index && expandedCell?.col === key}
                                onToggle={() =>
                                  setExpandedCell(
                                    expandedCell?.row === index && expandedCell?.col === key
                                      ? null
                                      : { row: index, col: key }
                                  )
                                }
                              />
                            </div>
                          </TableCell>

                        )
                      })}
                      <TableCell className="w-12">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(JSON.stringify(doc, null, 2))}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>


          </div>
        </div>
      ) : (
        <ScrollArea className="h-[600px] p-4">
          <div className="space-y-4">
            {processedData.map((doc, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Document {index + 1}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(JSON.stringify(doc, null, 2))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="text-sm font-mono text-foreground overflow-x-auto">
                  {JSON.stringify(doc, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}


      {/* Pagination */}
      {
        totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange?.(Number.parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => onPageChange?.(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
