"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"

type Suggestion = {
  id?: string
  name: string
  description: string
}

type Mention = { id: string; name: string }

interface InstructionEditorProps {
  mappingInstructions: string
  setMappingInstructions: (val: string) => void
  availableVariables: Suggestion[]
  namingStyle: string
  onMentionsChange?: (mentions: Mention[]) => void // optional callback to parent
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export function InstructionEditor({
  mappingInstructions,
  setMappingInstructions,
  availableVariables,
  namingStyle,
  onMentionsChange,
}: InstructionEditorProps) {
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [mentionedFunctions, setMentionedFunctions] = useState<Mention[]>([])

  // ✅ Use env base URL
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const { data, error } = useSWR(
    base ? `${base}/api/artifacts?type=mongoose_model` : null,
    fetcher
  )

  // Map API items to suggestions with id+name
  const availableFunctions: Suggestion[] = useMemo(() => {
    const items = data?.data ?? []
    return items.map((item: any) => ({
      id: item._id,
      name: item?.meta?.formatter_name ?? item._id,
      description: item?.meta?.notes ?? item.type ?? "",
    }))
  }, [data])

  // Helper: unique push
  const addMention = (m: Mention) => {
    setMentionedFunctions((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev
      const next = [...prev, m]
      onMentionsChange?.(next)
      return next
    })
  }

  // Helper: recompute mentions from text (keeps state in sync if user edits manually)
  useEffect(() => {
    // capture tokens like @Something (letters, digits, underscore allowed)
    const tokens = Array.from(new Set((mappingInstructions.match(/@([A-Za-z0-9_]+)/g) || []).map(t => t.slice(1))))
    if (!tokens.length) {
      if (mentionedFunctions.length) {
        setMentionedFunctions([])
        onMentionsChange?.([])
      }
      return
    }
    // Map tokens to known functions (keep only those we can identify → have ids)
    const mapByName = new Map(availableFunctions.map(f => [f.name, f]))
    const dedup: Mention[] = []
    for (const name of tokens) {
      const f = mapByName.get(name)
      if (f?.id) dedup.push({ id: f.id, name: f.name })
    }
    // Update only if changed
    const same =
      dedup.length === mentionedFunctions.length &&
      dedup.every((m) => mentionedFunctions.some((x) => x.id === m.id))
    if (!same) {
      setMentionedFunctions(dedup)
      onMentionsChange?.(dedup)
    }
  }, [mappingInstructions, availableFunctions]) // eslint-disable-line

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMappingInstructions(value)
    setCursorPosition(cursorPos)

    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        const query = textAfterAt.toLowerCase()
        const filteredFunctions = availableFunctions.filter(
          (f) => f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query),
        )
        const filteredVariables = availableVariables.filter(
          (v) => v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query),
        )
        setSuggestions([...filteredFunctions, ...filteredVariables])
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }

  // Prevent scroll-to-top: use type="button" and prevent default on mousedown
  const insertSuggestion = (suggestion: Suggestion) => {
    const textBeforeCursor = mappingInstructions.substring(0, cursorPosition)
    const textAfterCursor = mappingInstructions.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    const newText = textBeforeCursor.substring(0, lastAtIndex + 1) + suggestion.name + textAfterCursor
    setMappingInstructions(newText)
    setShowSuggestions(false)

    // Track mentions only for API-backed functions (those with id)
    if (suggestion.id) addMention({ id: suggestion.id, name: suggestion.name })

    // restore caret & focus
    setTimeout(() => {
      if (instructionsRef.current) {
        instructionsRef.current.focus()
        const newCursorPos = lastAtIndex + 1 + suggestion.name.length
        instructionsRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Remove a single mention: strip all @name occurrences and update list
  const removeMention = (m: Mention) => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`@${esc(m.name)}(?![A-Za-z0-9_])`, "g")
    const cleaned = mappingInstructions.replace(regex, "")
    setMappingInstructions(cleaned)
    const next = mentionedFunctions.filter((x) => x.id !== m.id)
    setMentionedFunctions(next)
    onMentionsChange?.(next)
  }

  // Remove all mentions
  const clearAllMentions = () => {
    const cleaned = mappingInstructions.replace(/@([A-Za-z0-9_]+)/g, "")
    setMappingInstructions(cleaned)
    setMentionedFunctions([])
    onMentionsChange?.([])
  }

  return (
    <div className="relative">
      <textarea
        ref={instructionsRef}
        value={mappingInstructions}
        onChange={handleInstructionsChange}
        spellCheck={false}
        className="min-h-[420px] leading-6 font-mono text-[13px] md:text-sm w-full border border-input rounded px-3 py-3 bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 placeholder:text-muted-foreground/70"
        placeholder={`1) remove fields: sales_meta_data, origin
2) rename: SalesPrice → salesPrice, MakingCost → makingCost
3) cast to number: salesPrice, makingCost
4) compute profit = @calculateProfit(salesPrice, makingCost)
5) add timestamp = @currentDate
6) output ${namingStyle} keys

Type @ to see available functions and variables`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.id ?? "var"}-${suggestion.name}-${index}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keeps focus; avoids scroll jump
              className="w-full px-3 py-2 text-left hover:bg-muted flex flex-col cursor-pointer"
              onClick={() => insertSuggestion(suggestion)}
            >
              <span className="font-medium">@{suggestion.name}</span>
              <span className="text-sm text-muted-foreground">{suggestion.description}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">Failed to load functions: {error.message}</p>
      )}

      {/* Mentions bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mentionedFunctions.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs bg-muted/40"
          >
            @{m.name}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => removeMention(m)}
              className="cursor-pointer leading-none"
              aria-label={`Remove @${m.name}`}
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}

        {mentionedFunctions.length > 0 && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearAllMentions}
            className="text-xs underline text-muted-foreground hover:text-foreground"
            title="Remove all mentions from editor"
          >
            Remove all mentions
          </button>
        )}
      </div>

      {/* For debugging / to send to API */}
      {/* You can lift this state via onMentionsChange prop */}
      {/* <pre className="mt-2 text-xs opacity-70">{JSON.stringify(mentionedFunctions, null, 2)}</pre> */}
    </div>
  )
}