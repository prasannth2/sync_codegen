"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import leven from "leven"
import { Code, Database, Filter, Globe, Maximize2, Minimize2, Play, SortAsc, X } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { DataTable } from "./data-table"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

type Doc = Record<string, any>

interface DatabaseExplorerProps {
  selectedCollection: string
  setTotal: (data: any) => void
  total: number
}

/* ---------------- Zod schemas ---------------- */
const projectSchema = z.record(z.union([z.literal(0), z.literal(1)]))
const sortSchema = z.union([
  z.record(z.union([z.literal(1), z.literal(-1)])),
  z.array(z.tuple([z.string(), z.union([z.literal(1), z.literal(-1)])]))
])
const collationSchema = z
  .object({
    locale: z.string(),
  })
  .catchall(z.any()) // allow extra fields
const hintSchema = z.record(z.union([z.literal(1), z.literal(-1)]))

export function DatabaseExplorer({ selectedCollection, setTotal, total }: DatabaseExplorerProps) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isQueryExpanded, setIsQueryExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentQuery, setCurrentQuery] = useState<any>({})
  const [queryMode, setQueryMode] = useState<"browse" | "query" | "aggregate">("browse")

  const [queryText, setQueryText] = useState("{}")
  const [aggregationPipeline, setAggregationPipeline] = useState('[\n  { "$match": {} },\n  { "$limit": 20 }\n]')
  const [activeQueryTab, setActiveQueryTab] = useState("find")
  const [singleLineAggregation, setSingleLineAggregation] = useState('{ "$match": {} }')

  const [projectText, setProjectText] = useState("{}")
  const [sortText, setSortText] = useState("{}")
  const [collationText, setCollationText] = useState("{}")
  const [indexHintText, setIndexHintText] = useState("{}")

  const [errors, setErrors] = useState<{
    query?: string
    project?: string
    sort?: string
    collation?: string
    hint?: string
  }>({})

  const [collectionStats, setCollectionStats] = useState({
    documentCount: 0,
    avgDocSize: 0,
    totalSize: 0,
    indexes: 0,
  })

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  /* ---------------- Reset when collection changes ---------------- */
  useEffect(() => {
    if (!selectedCollection) return

    // ✅ reset states when switching collections
    setDocs([])
    setTotal(0)
    setCurrentPage(1)
    setQueryMode("browse")
    setQueryText("{}")
    setAggregationPipeline('[\n  { "$match": {} },\n  { "$limit": 20 }\n]')
    setSingleLineAggregation('{ "$match": {} }')
    setProjectText("{}")
    setSortText("{}")
    setCollationText("{}")
    setIndexHintText("{}")
    setErrors({})

    loadCollectionData(1, pageSize)
  }, [selectedCollection])

  /* ---------------- Reload data when page/pageSize changes ---------------- */
  useEffect(() => {
    if (!selectedCollection) return
    loadCollectionData(currentPage, pageSize)
  }, [currentPage, pageSize])

  /* ---------------- Validation ---------------- */
  const validateJSON = (val: string, key: keyof typeof errors) => {
    try {
      const parsed = JSON.parse(val)

      switch (key) {
        case "project":
          projectSchema.parse(parsed)
          break
        case "sort":
          sortSchema.parse(parsed)
          break
        case "collation": {
          const keys = Object.keys(parsed)
          const badKey = keys.find((k) => k !== "locale" && leven("locale", k) <= 2)
          if (badKey) {
            setErrors((prev) => ({ ...prev, collation: `❌ Did you mean 'locale' instead of '${badKey}'?` }))
            return
          }
          collationSchema.parse(parsed)
          break
        }
        case "hint":
          hintSchema.parse(parsed)
          break
        default:
          // query: any valid JSON allowed
          break
      }

      setErrors((prev) => ({ ...prev, [key]: undefined }))
    } catch {
      setErrors((prev) => ({ ...prev, [key]: "Invalid JSON" }))
    }
  }

  const loadCollectionData = async (page = currentPage, limit = pageSize) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/mongo/api/${selectedCollection}?page=${page}&limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setDocs(data.docs || [])
        setTotal(data.total || 0)
      } else {
        console.error("Failed to load collection data:", response.statusText)
        setDocs([])
        setTotal(0)
      }
    } catch (error) {
      console.error("Failed to load collection data:", error)
      setDocs([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCollectionStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mongo/api/${selectedCollection}/stats`)
      if (response.ok) {
        const stats = await response.json()
        setCollectionStats(stats)
      } else {
        setCollectionStats({ documentCount: 0, avgDocSize: 0, totalSize: 0, indexes: 0 })
      }
    } catch (error) {
      console.error("Failed to load collection stats:", error)
      setCollectionStats({ documentCount: 0, avgDocSize: 0, totalSize: 0, indexes: 0 })
    }
  }

  const handleQueryExecute = async () => {
    if (Object.values(errors).some(Boolean)) {
      console.warn("Fix JSON errors before executing")
      return
    }

    setIsLoading(true)
    setCurrentPage(1)

    try {
      let query, type: "query" | "aggregate"

      if (activeQueryTab === "find") {
        query = JSON.parse(queryText)
        type = "query"
      } else {
        const parsed = JSON.parse(aggregationPipeline)
        query = Array.isArray(parsed) ? parsed : [parsed]
        if (!query.some((stage) => stage.$limit)) {
          query.push({ $limit: pageSize })
        }
        type = "aggregate"
      }

      setCurrentQuery(query)
      setQueryMode(type)
      setIsQueryExpanded(false)

      let response
      if (type === "query") {
        const queryPayload: any = { filter: query, page: 1, limit: pageSize }

        if (projectText && !errors.project && projectText !== "{}") queryPayload.project = JSON.parse(projectText)
        if (sortText && !errors.sort && sortText !== "{}") queryPayload.sort = JSON.parse(sortText)
        if (collationText && !errors.collation && collationText !== "{}") queryPayload.collation = JSON.parse(collationText)
        if (indexHintText && !errors.hint && indexHintText !== "{}") queryPayload.hint = JSON.parse(indexHintText)

        response = await fetch(`${API_BASE_URL}/mongo/api/${selectedCollection}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queryPayload),
        })
      } else {
        response = await fetch(`${API_BASE_URL}/mongo/api/${selectedCollection}/aggregate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipeline: query }),
        })
      }

      if (!response.ok) {
        const err = await response.json()
        console.error("Query execution failed:", err.error)

        if (activeQueryTab === "find") {
          if (err.error.includes("collation")) {
            setErrors((prev) => ({ ...prev, collation: err.error }))
          } else if (err.error.includes("sort")) {
            setErrors((prev) => ({ ...prev, sort: err.error }))
          } else if (err.error.includes("projection")) {
            setErrors((prev) => ({ ...prev, project: err.error }))
          } else {
            setErrors((prev) => ({ ...prev, query: err.error }))
          }
        }
        setDocs([])
        setTotal(0)
        return
      } else {
        const data = await response.json()
        setDocs(data.docs || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Query execution failed:", error)
      setDocs([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const clearQuery = () => {
    setQueryText("{}")
    setAggregationPipeline('[\n  { "$match": {} },\n  { "$limit": 20 }\n]')
    setSingleLineAggregation('{ "$match": {} }')
    setProjectText("{}")
    setSortText("{}")
    setCollationText("{}")
    setIndexHintText("{}")
    setErrors({})
    setQueryMode("browse")
    setCurrentPage(1)
    loadCollectionData(1, pageSize)
  }

  if (!selectedCollection) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a collection to explore your data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border gap-0 rounded py-0">
        <CardContent className="p-0">
          {/* Query bar */}
          <div className="border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 p-2">
              <div className="flex items-center gap-2 flex-1">
                <Code className="h-4 w-4 text-muted-foreground" />
                <Tabs value={activeQueryTab} onValueChange={setActiveQueryTab} className="flex-1">
                  <div className="flex items-center gap-2">
                    <TabsList className="h-8 bg-background">
                      <TabsTrigger value="find" className="text-xs px-3 py-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded">Find</TabsTrigger>
                      <TabsTrigger value="aggregate" className="text-xs px-3 py-1 data-[state=active]:bg-primary data-[state=active]:text-white rounded">Aggregate</TabsTrigger>
                    </TabsList>
                    {!isQueryExpanded ? (
                      <Input
                        value={activeQueryTab === "find" ? queryText : singleLineAggregation}
                        onChange={(e) => {
                          if (activeQueryTab === "find") {
                            setQueryText(e.target.value)
                            validateJSON(e.target.value, "query")
                          } else {
                            setSingleLineAggregation(e.target.value)
                          }
                        }}
                        placeholder={activeQueryTab === "find" ? '{ "field": "value" }' : '{ "$match": {} }'}
                        className={`font-mono text-sm flex-1 ${errors.query ? "border-red-500" : ""}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleQueryExecute()
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsQueryExpanded(!isQueryExpanded)} className="h-8">
                  {isQueryExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
                <Button
                  onClick={handleQueryExecute}
                  disabled={isLoading || Object.values(errors).some(Boolean)}
                  size="sm"
                  className="h-8 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? <div className="animate-spin rounded h-3 w-3 border-b-2 border-white"></div> : <Play className="h-3 w-3" />}
                </Button>
                {queryMode !== "browse" && (
                  <Button variant="outline" size="sm" onClick={clearQuery} className="h-8 bg-transparent">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded editor */}
            {isQueryExpanded && (
              <div className="border-t border-border bg-background p-4">
                <Tabs value={activeQueryTab} onValueChange={setActiveQueryTab}>
                  <TabsContent value="find" className="mt-0 space-y-2">
                    {/* Query */}
                    <div className="flex items-start gap-4">
                      <Label className="w-32 text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Query
                      </Label>
                      <div className="flex-1 space-y-1">
                        <Textarea
                          value={queryText}
                          onChange={(e) => {
                            setQueryText(e.target.value)
                            validateJSON(e.target.value, "query")
                          }}
                          className={`rounded font-mono text-sm resize-none ${errors.query ? "border-red-500" : ""}`}
                          placeholder='{\n  "field": "value",\n  "status": "active"\n}'
                        />
                        {errors.query && <p className="text-xs text-red-500">{errors.query}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setQueryText("{}")} className="h-7 text-xs rounded">Clear</Button>
                    </div>

                    {/* Project */}
                    <div className="flex items-start gap-4">
                      <Label className="w-32 text-sm font-medium">Project</Label>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={projectText}
                          onChange={(e) => {
                            setProjectText(e.target.value)
                            validateJSON(e.target.value, "project")
                          }}
                          className={`rounded font-mono text-sm ${errors.project ? "border-red-500" : ""}`}
                          placeholder='{ "field": 0 }'
                        />
                        {errors.project && <p className="text-xs text-red-500">{errors.project}</p>}
                        <p className="text-xs text-muted-foreground">Specify which fields to include (1) or exclude (0)</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setProjectText("{}")} className="h-7 text-xs rounded">Clear</Button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-start gap-4">
                      <Label className="w-32 text-sm font-medium flex items-center gap-2">
                        <SortAsc className="h-4 w-4" /> Sort
                      </Label>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={sortText}
                          onChange={(e) => {
                            setSortText(e.target.value)
                            validateJSON(e.target.value, "sort")
                          }}
                          className={`rounded font-mono text-sm ${errors.sort ? "border-red-500" : ""}`}
                          placeholder='{ "field": -1 } or [["field", -1]]'
                        />
                        {errors.sort && <p className="text-xs text-red-500">{errors.sort}</p>}
                        <p className="text-xs text-muted-foreground">Use 1 for ascending, -1 for descending</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSortText("{}")} className="h-7 text-xs rounded">Clear</Button>
                    </div>

                    {/* Collation */}
                    <div className="flex items-start gap-4">
                      <Label className="w-32 text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Collation
                      </Label>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={collationText}
                          onChange={(e) => {
                            setCollationText(e.target.value)
                            validateJSON(e.target.value, "collation")
                          }}
                          className={`rounded font-mono text-sm ${errors.collation ? "border-red-500" : ""}`}
                          placeholder='{ "locale": "simple" }'
                        />
                        {errors.collation && <p className="text-xs text-red-500">{errors.collation}</p>}
                        <p className="text-xs text-muted-foreground">Specify language-specific rules for string comparison</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCollationText("{}")} className="h-7 text-xs rounded">Clear</Button>
                    </div>

                    {/* Index Hint */}
                    <div className="flex items-start gap-4">
                      <Label className="w-32 text-sm font-medium">Index Hint</Label>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={indexHintText}
                          onChange={(e) => {
                            setIndexHintText(e.target.value)
                            validateJSON(e.target.value, "hint")
                          }}
                          className={`rounded font-mono text-sm ${errors.hint ? "border-red-500" : ""}`}
                          placeholder='{ "field": -1 }'
                        />
                        {errors.hint && <p className="text-xs text-red-500">{errors.hint}</p>}
                        <p className="text-xs text-muted-foreground">Force MongoDB to use a specific index</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setIndexHintText("{}")} className="h-7 text-xs rounded">Clear</Button>
                    </div>
                  </TabsContent>

                  {/* Aggregate tab */}
                  <TabsContent value="aggregate" className="mt-0">
                    <Textarea
                      value={aggregationPipeline}
                      onChange={(e) => setAggregationPipeline(e.target.value)}
                      className="font-mono text-sm min-h-[150px] resize-none rounded"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          <div className="p-2">
            <DataTable
              key={selectedCollection}
              data={docs}
              total={total}
              isLoading={isLoading}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
