// components/terminal-log.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useToast } from "@/components/ui/use-toast";

export type LogLevel = "info" | "warn" | "error" | "debug";

// Supports either `message` or `args`
export type LogLine = {
  ts?: string;
  level?: LogLevel;
  message?: string;
  args?: any[];
};

function levelBadge(level?: LogLevel) {
  const lv = (level ?? "info").toLowerCase() as LogLevel;
  const map: Record<
    LogLevel,
    { variant: "default" | "secondary" | "destructive" | "outline"; text: string }
  > = {
    info: { variant: "secondary", text: "INFO" },
    warn: { variant: "outline", text: "WARN" },
    error: { variant: "destructive", text: "ERROR" },
    debug: { variant: "default", text: "DEBUG" },
  };
  return (
    <Badge variant={map[lv].variant} className="px-2 py-0 h-5 text-[10px] leading-5">
      {map[lv].text}
    </Badge>
  );
}

function levelTextClass(level?: LogLevel) {
  const lv = (level ?? "info").toLowerCase() as LogLevel;
  // Pick soft but distinct colors on black bg
  switch (lv) {
    case "warn":
      return "text-amber-200";
    case "error":
      return "text-rose-200";
    case "debug":
      return "text-sky-200";
    case "info":
    default:
      return "text-emerald-200";
  }
}

// Pretty-print for args (strings, numbers, objects, errors)
function formatArg(a: any): string {
  if (a == null) return String(a);
  if (typeof a === "string") return a;
  if (typeof a === "number" || typeof a === "boolean") return String(a);
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  try {
    return JSON.stringify(a, (_k, v) => (v instanceof Date ? v.toISOString() : v), 2);
  } catch {
    return String(a);
  }
}

function getDisplayMessage(l: LogLine): string {
  if (l.message && l.message.length) return l.message;
  if (Array.isArray(l.args) && l.args.length) return l.args.map(formatArg).join(" ");
  return "";
}

export function TerminalLog({
  logs,
  title = "Execution Log",
  className,
  height = 260 as number | string,
  onClear,
}: {
  logs: LogLine[];
  title?: string;
  className?: string;
  height?: number | string; // number = px; string = any CSS size (e.g., "50vh")
  onClear?: () => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const { copied, copy } = useCopy();
  const { toast } = useToast();

  // auto-scroll to bottom on new lines
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleCopyAll = () => {
    const text = logs
      .map((l) => {
        const ts = l.ts ? `[${l.ts}] ` : "";
        const lvl = (l.level || "info").toUpperCase();
        const msg = getDisplayMessage(l);
        return `${ts}${lvl}: ${msg}`;
      })
      .join("\n");
    copy(text);
    toast({ title: "Copied", description: "Execution logs copied to clipboard." });
  };

  // Make sure the container can scroll in all contexts (dialogs, flex parents, etc.)
  const style: React.CSSProperties =
    typeof height === "number" ? { height } : { height };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex gap-2">
          <Button
            className="cursor-pointer"
            size="sm"
            variant="outline"
            onClick={handleCopyAll}
            disabled={!logs.length}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </>
            )}
          </Button>
          {onClear ? (
            <Button size="sm" variant="outline" onClick={onClear} disabled={!logs.length}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        className={[
          "w-full rounded-lg border",
          "bg-black text-zinc-100",
          "font-mono text-xs p-3",
          "overflow-y-auto overscroll-contain",
          "scrollbar-thin scrollbar-thumb-zinc-700/70 scrollbar-track-zinc-900",
          "min-h-0", // <- ensure it can shrink inside flex parents
        ].join(" ")}
        style={style}
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className="opacity-60">No logs yet…</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l, i) => {
              const msg = getDisplayMessage(l);
              return (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {/* timestamp — muted gray */}
                  <span className="text-zinc-400/80 mr-2">
                    {l.ts ? `[${l.ts}]` : ""}
                  </span>
                  {/* level badge */}
                  <span className="mr-2 inline-block align-middle">{levelBadge(l.level)}</span>
                  {/* message — color by level */}
                  <span className={levelTextClass(l.level)}>{msg}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}