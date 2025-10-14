"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogLine {
  ts?: string;
  level?: LogLevel;
  message?: string;
  args?: any[];
}

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
    <Badge variant={map[lv].variant} className={cn("px-2 py-0 h-5 text-[10px] leading-5", map[lv].variant === "outline" && "text-orange-300")}>
      {map[lv].text}
    </Badge>
  );
}

function levelTextClass(level?: LogLevel) {
  switch (level) {
    case "warn":
      return "text-amber-200";
    case "error":
      return "text-rose-300";
    case "debug":
      return "text-sky-200";
    default:
      return "text-emerald-200";
  }
}

// -------------------- argument renderer --------------------

function ArgRenderer({ arg, autoExpand }: { arg: any; autoExpand?: boolean }) {
  const [expanded, setExpanded] = React.useState(autoExpand);

  if (arg == null) return <span>null</span>;
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean")
    return <span>{String(arg)}</span>;

  // Error instance
  if (arg instanceof Error) {
    return (
      <div className="mt-1 ml-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>{arg.name}</span>
        </button>
        {expanded && (
          <pre className="text-[11px] bg-zinc-900/70 text-rose-300 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
            {arg.stack || arg.message}
          </pre>
        )}
      </div>
    );
  }

  // Plain object
  if (typeof arg === "object") {
    return (
      <div className="mt-1 ml-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>{arg.name ?? "Object"}</span>
        </button>
        {expanded && (
          <pre className="text-[11px] bg-zinc-900/70 text-zinc-300 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(arg, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return <span>{String(arg)}</span>;
}

function LogMessage({ log }: { log: LogLine }) {
  if (log.message) return <>{log.message}</>;
  if (!Array.isArray(log.args)) return null;
  return (
    <>
      {log.args.map((a, i) => (
        <ArgRenderer key={i} arg={a} autoExpand={log.level === "error"} />
      ))}
    </>
  );
}

// -------------------- main component --------------------

export function TerminalLog({
  logs,
  title = "Execution Log",
  className,
  height = 260,
  onClear,
}: {
  logs: LogLine[];
  title?: string;
  className?: string;
  height?: number | string;
  onClear?: () => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const { copied, copy } = useCopy();
  const { toast } = useToast();

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleCopyAll = () => {
    const text = logs
      .map((l) => {
        const ts = l.ts ? `[${l.ts}] ` : "";
        const lvl = (l.level || "info").toUpperCase();
        const msg =
          l.message ??
          (Array.isArray(l.args)
            ? l.args
                .map((a) =>
                  typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
                )
                .join(" ")
            : "");
        return `${ts}${lvl}: ${msg}`;
      })
      .join("\n");

    copy(text);
    toast({ title: "Copied", description: "Execution logs copied to clipboard." });
  };

  const style: React.CSSProperties =
    typeof height === "number" ? { height } : { height };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyAll} disabled={!logs.length}>
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
          {onClear && (
            <Button size="sm" variant="outline" onClick={onClear} disabled={!logs.length}>
              Clear
            </Button>
          )}
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
          "min-h-0",
        ].join(" ")}
        style={style}
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className="opacity-60">No logs yet…</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                <span className="text-zinc-400/80 mr-2">{l.ts ? `[${l.ts}]` : ""}</span>
                <span className="mr-2 inline-block align-middle">{levelBadge(l.level)}</span>
                <span className={levelTextClass(l.level)}>
                  <LogMessage log={l} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}