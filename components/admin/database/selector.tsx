"use client"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"

interface ColumnSelectorProps {
    allKeys: string[]
    selectedColumns: string[]
    onChange: (cols: string[]) => void
}

export function ColumnSelector({
    allKeys,
    selectedColumns,
    onChange,
}: ColumnSelectorProps) {
    const [open, setOpen] = React.useState(false)

    const toggleColumn = (key: string) => {
        if (selectedColumns.includes(key)) {
            onChange(selectedColumns.filter((col) => col !== key))
        } else {
            onChange([...selectedColumns, key])
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[240px] justify-between rounded"
                >
                    Columns ({selectedColumns.length})
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            {/* 👇 Radix Popover handles positioning automatically */}
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={4}
                className="w-[280px] p-0 z-[9999]"
            >
                <Command shouldFilter className="rounded">
                    <CommandInput placeholder="Search fields..." />
                    <CommandList className="max-h-60 overflow-y-auto rounded">
                        <CommandEmpty>No fields found.</CommandEmpty>
                        <CommandGroup>
                            {allKeys.map((key) => (
                                <CommandItem
                                    key={key}
                                    // 👇 prevent default to stop closing on select
                                    onSelect={(e) => {
                                        // e.preventDefault()
                                        toggleColumn(key)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary",
                                            selectedColumns.includes(key)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    <span className="font-mono text-sm">{key}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
