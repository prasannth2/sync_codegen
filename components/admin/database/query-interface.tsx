"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Save, History, Code, Zap, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QueryInterfaceProps {
  selectedCollection: string
  onQueryExecute: (query: any, type: "query" | "aggregate") => void
  isLoading?: boolean
}

export function QueryInterface({ selectedCollection, onQueryExecute, isLoading = false }: QueryInterfaceProps) {
  const [queryText, setQueryText] = useState("{}")
  const [aggregationPipeline, setAggregationPipeline] = useState('[\n  { "$match": {} },\n  { "$limit": 20 }\n]')
  const [activeTab, setActiveTab] = useState("find")
  const [queryHistory, setQueryHistory] = useState<Array<{ id: string; query: string; type: string; timestamp: Date }>>(
    [],
  )
  const [queryError, setQueryError] = useState<string | null>(null)
  const [querySuccess, setQuerySuccess] = useState<string | null>(null)

  const validateJSON = (text: string) => {
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  }

  const executeQuery = async () => {
    setQueryError(null)
    setQuerySuccess(null)

    if (activeTab === "find") {
      if (!validateJSON(queryText)) {
        setQueryError("Invalid JSON syntax in query")
        return
      }

      try {
        const parsedQuery = JSON.parse(queryText)
        onQueryExecute(parsedQuery, "query")

        // Add to history
        const historyItem = {
          id: Date.now().toString(),
          query: queryText,
          type: "find",
          timestamp: new Date(),
        }
        setQueryHistory((prev) => [historyItem, ...prev.slice(0, 9)])
        setQuerySuccess("Query executed successfully")
      } catch (error) {
        setQueryError("Failed to execute query")
      }
    } else {
      if (!validateJSON(aggregationPipeline)) {
        setQueryError("Invalid JSON syntax in aggregation pipeline")
        return
      }

      try {
        const parsedPipeline = JSON.parse(aggregationPipeline)
        onQueryExecute(parsedPipeline, "aggregate")

        // Add to history
        const historyItem = {
          id: Date.now().toString(),
          query: aggregationPipeline,
          type: "aggregate",
          timestamp: new Date(),
        }
        setQueryHistory((prev) => [historyItem, ...prev.slice(0, 9)])
        setQuerySuccess("Aggregation executed successfully")
      } catch (error) {
        setQueryError("Failed to execute aggregation")
      }
    }
  }

  const loadFromHistory = (historyItem: any) => {
    if (historyItem.type === "find") {
      setQueryText(historyItem.query)
      setActiveTab("find")
    } else {
      setAggregationPipeline(historyItem.query)
      setActiveTab("aggregate")
    }
  }

  const quickQueries = [
    { name: "Find All", query: "{}" },
    { name: "Recent Documents", query: '{ "createdAt": { "$gte": "2024-01-01" } }' },
    { name: "Active Status", query: '{ "status": "active" }' },
    { name: "Has Email", query: '{ "email": { "$exists": true } }' },
  ]

  const quickAggregations = [
    {
      name: "Count by Status",
      pipeline: '[\n  { "$group": { "_id": "$status", "count": { "$sum": 1 } } },\n  { "$sort": { "count": -1 } }\n]',
    },
    {
      name: "Recent Activity",
      pipeline:
        '[\n  { "$match": { "createdAt": { "$gte": "2024-01-01" } } },\n  { "$sort": { "createdAt": -1 } },\n  { "$limit": 10 }\n]',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Query Status */}
      {queryError && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">{queryError}</AlertDescription>
        </Alert>
      )}

      {querySuccess && (
        <Alert className="border-success/50 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{querySuccess}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Query Interface */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Query Builder
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {selectedCollection}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-border px-6">
                  <TabsList className="bg-transparent h-12 p-0">
                    <TabsTrigger
                      value="find"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                    >
                      Find
                    </TabsTrigger>
                    <TabsTrigger
                      value="aggregate"
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                    >
                      Aggregate
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="find" className="mt-0 p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="query" className="text-sm font-medium">
                        Find Query (JSON)
                      </Label>
                      <Textarea
                        id="query"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        className="code-editor mt-2 min-h-[200px] font-mono text-sm"
                        placeholder='{ "field": "value" }'
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={executeQuery}
                        disabled={isLoading || !selectedCollection}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Query
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="border-border bg-transparent">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="aggregate" className="mt-0 p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pipeline" className="text-sm font-medium">
                        Aggregation Pipeline (JSON Array)
                      </Label>
                      <Textarea
                        id="pipeline"
                        value={aggregationPipeline}
                        onChange={(e) => setAggregationPipeline(e.target.value)}
                        className="code-editor mt-2 min-h-[250px] font-mono text-sm"
                        placeholder='[{ "$match": {} }, { "$group": {} }]'
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={executeQuery}
                        disabled={isLoading || !selectedCollection}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Pipeline
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="border-border bg-transparent">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Queries */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickQueries.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2 hover:bg-accent"
                  onClick={() => {
                    setQueryText(item.query)
                    setActiveTab("find")
                  }}
                >
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{item.query}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Aggregations */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Aggregations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickAggregations.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2 hover:bg-accent"
                  onClick={() => {
                    setAggregationPipeline(item.pipeline)
                    setActiveTab("aggregate")
                  }}
                >
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {item.pipeline.split("\n")[1]?.trim() || "Pipeline"}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Query History */}
          {queryHistory.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Queries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {queryHistory.slice(0, 5).map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 hover:bg-accent"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                        {item.query.substring(0, 50)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
