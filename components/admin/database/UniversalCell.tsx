import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";




export function UniversalCell({
    value,
    isId = false,
    expanded,
    onToggle,
}: {
    value: any
    isId?: boolean
    expanded: boolean
    onToggle: () => void
}) {
    const displayText =
        value === null || value === undefined
            ? "null"
            : typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value)

    const handleCopy = () => {
        navigator.clipboard.writeText(displayText)
    }

    return (
        <div className="cursor-pointer" onDoubleClick={onToggle}>
            {expanded ? (
                <div className="relative bg-muted p-2 rounded max-h-96 overflow-auto">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleCopy()
                        }}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                        {displayText}
                    </pre>
                </div>
            ) : (
                <span
                    className={
                        isId
                            ? "text-primary truncate text-xs"
                            : "text-foreground truncate text-xs"
                    }
                >
                    {displayText}
                </span>
            )}
        </div>
    )
}
