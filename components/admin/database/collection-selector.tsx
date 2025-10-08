"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Database, Table } from "lucide-react"

interface CollectionSelectorProps {
  collections: string[]
  selectedCollection: string
  onCollectionChange: (collection: string) => void
  isLoading?: boolean
  total?: number
}

export function CollectionSelector({
  collections,
  selectedCollection,
  onCollectionChange,
  isLoading = false,
  total
}: CollectionSelectorProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <span className="font-medium text-foreground">Database Explorer</span>
      </div>

      <div className="flex items-center gap-2">
        <Table className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Collection:</span>
        <Select value={selectedCollection} onValueChange={onCollectionChange} disabled={isLoading}>
          <SelectTrigger className="w-[200px] bg-background border-border rounded">
            <SelectValue placeholder="Select collection" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border rounded">
            {collections.map((collection) => (
              <SelectItem key={collection} value={collection} className="hover:bg-accent">
                {collection}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCollection && (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 rounded">
          {selectedCollection}  {total} documents
        </Badge>
      )}
    </div>
  )
}
