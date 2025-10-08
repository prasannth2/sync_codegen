"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { CalendarIcon, Filter, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

interface FilterCondition {
  id: string
  field: string
  operator: string
  value: any
  type: "string" | "number" | "boolean" | "date" | "null"
}

interface AdvancedFiltersProps {
  availableFields: string[]
  onFiltersChange: (filters: FilterCondition[]) => void
  onClearFilters: () => void
}

const OPERATORS = {
  string: [
    { value: "$eq", label: "equals" },
    { value: "$ne", label: "not equals" },
    { value: "$regex", label: "contains" },
    { value: "$in", label: "in array" },
    { value: "$nin", label: "not in array" },
    { value: "$exists", label: "exists" },
  ],
  number: [
    { value: "$eq", label: "equals" },
    { value: "$ne", label: "not equals" },
    { value: "$gt", label: "greater than" },
    { value: "$gte", label: "greater than or equal" },
    { value: "$lt", label: "less than" },
    { value: "$lte", label: "less than or equal" },
    { value: "$in", label: "in array" },
    { value: "$nin", label: "not in array" },
    { value: "$exists", label: "exists" },
  ],
  boolean: [
    { value: "$eq", label: "equals" },
    { value: "$ne", label: "not equals" },
    { value: "$exists", label: "exists" },
  ],
  date: [
    { value: "$eq", label: "equals" },
    { value: "$ne", label: "not equals" },
    { value: "$gt", label: "after" },
    { value: "$gte", label: "on or after" },
    { value: "$lt", label: "before" },
    { value: "$lte", label: "on or before" },
    { value: "$exists", label: "exists" },
  ],
  null: [
    { value: "$exists", label: "exists" },
    { value: "$eq", label: "is null" },
    { value: "$ne", label: "is not null" },
  ],
}

export function AdvancedFilters({ availableFields, onFiltersChange, onClearFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      field: availableFields[0] || "",
      operator: "$eq",
      value: "",
      type: "string",
    }
    const updatedFilters = [...filters, newFilter]
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    const updatedFilters = filters.map((filter) => (filter.id === id ? { ...filter, ...updates } : filter))
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const removeFilter = (id: string) => {
    const updatedFilters = filters.filter((filter) => filter.id !== id)
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const clearAllFilters = () => {
    setFilters([])
    onFiltersChange([])
    onClearFilters()
  }

  const getFieldType = (field: string): "string" | "number" | "boolean" | "date" | "null" => {
    // Simple heuristics to determine field type
    if (field.includes("date") || field.includes("time") || field.includes("At")) return "date"
    if (field.includes("count") || field.includes("age") || field.includes("score") || field.includes("size"))
      return "number"
    if (field.includes("is") || field.includes("has") || field.includes("verified") || field.includes("enabled"))
      return "boolean"
    return "string"
  }

  const renderValueInput = (filter: FilterCondition) => {
    const { type, operator, value } = filter

    if (operator === "$exists") {
      return (
        <Select
          value={value?.toString() || "true"}
          onValueChange={(val) => updateFilter(filter.id, { value: val === "true" })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">exists</SelectItem>
            <SelectItem value="false">doesnt exist</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (type === "boolean") {
      return (
        <Select
          value={value?.toString() || "true"}
          onValueChange={(val) => updateFilter(filter.id, { value: val === "true" })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (type === "date") {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-start text-left font-normal bg-transparent">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => updateFilter(filter.id, { value: date?.toISOString() })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )
    }

    if (operator === "$in" || operator === "$nin") {
      return (
        <Input
          placeholder="value1,value2,value3"
          value={Array.isArray(value) ? value.join(",") : value || ""}
          onChange={(e) => {
            const arrayValue = e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter((v) => v)
            updateFilter(filter.id, { value: arrayValue })
          }}
          className="w-48"
        />
      )
    }

    if (type === "number") {
      return (
        <Input
          type="number"
          placeholder="Enter number"
          value={value || ""}
          onChange={(e) => updateFilter(filter.id, { value: Number.parseFloat(e.target.value) || "" })}
          className="w-32"
        />
      )
    }

    return (
      <Input
        placeholder="Enter value"
        value={value || ""}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        className="w-48"
      />
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-border bg-transparent rounded">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
              {filters.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Card className="border-0 shadow-none rounded">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Advanced Filters</CardTitle>
              <div className="flex items-center gap-2">
                {filters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {filters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No filters applied</p>
                <p className="text-sm">Click Add Filter to start filtering your data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filters.map((filter, index) => (
                  <div key={filter.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    {index > 0 && (
                      <Badge variant="outline" className="text-xs">
                        AND
                      </Badge>
                    )}

                    <Select
                      value={filter.field}
                      onValueChange={(field) => {
                        const type = getFieldType(field)
                        updateFilter(filter.id, {
                          field,
                          type,
                          operator: OPERATORS[type][0].value,
                          value: type === "boolean" ? true : "",
                        })
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            <span className="font-mono text-sm">{field}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filter.operator} onValueChange={(operator) => updateFilter(filter.id, { operator })}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS[filter.type].map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {renderValueInput(filter)}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
