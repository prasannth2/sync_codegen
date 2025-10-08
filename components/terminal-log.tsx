// components/terminal-log.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react"; // <- removed ScrollArea (unused)

export type LogLevel = "info" | "warn" | "error" | "debug";
export type LogLine = { ts?: string; level?: LogLevel; message: string };

function levelBadge(level?: LogLevel) {
  const lv = (level ?? "info").toLowerCase() as LogLevel;
  const map: Record<LogLevel, { variant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
    info:  { variant: "secondary", text: "INFO" },
    warn:  { variant: "outline",   text: "WARN" },
    error: { variant: "destructive", text: "ERROR" },
    debug: { variant: "default", text: "DEBUG" },
  };
  return <Badge variant={map[lv].variant} className="px-2 py-0 h-5 text-xs">{map[lv].text}</Badge>;
}

export function TerminalLog({
  logs,
  title = "Execution Log",
  className,
  height = 260 as number | string,   // <- allow "100%" (string) or number
  onClear,
}: {
  logs: LogLine[];
  title?: string;
  className?: string;
  height?: number | string;           // <- updated type
  onClear?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const copyAll = async () => {
    const text = logs
      .map(l => `${l.ts ? `[${l.ts}] ` : ""}${(l.level || "info").toUpperCase()}: ${l.message}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyAll}>
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
          {onClear ? (
            <Button size="sm" variant="outline" onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={ref}
        className="w-full rounded-lg border bg-black text-green-200 font-mono text-xs p-3 overflow-y-auto"
        style={{ height }} // <- now accepts "100%" when used inside resizable panel
      >
        {logs.length === 0 ? (
          <div className="opacity-60">No logs yet…</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                <span className="opacity-70 mr-2">{l.ts ? `[${l.ts}]` : ""}</span>
                <span className="mr-2 inline-block align-middle">{levelBadge(l.level)}</span>
                <span>{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}