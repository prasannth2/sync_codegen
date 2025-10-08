// components/workflow-logs/workflow-logs-page.tsx
"use client";

import * as React from "react";
import { LogsTable } from "./logs-table";
import { LogDetailsSheet } from "./log-details-sheet";
import { ErrorBanner } from "./error-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Play, RefreshCcw } from "lucide-react";
import { useWorkflowRuns } from "@/hooks/use-workflow-runs";
import { WorkflowRun } from "./types";
import { useToast } from "@/components/ui/use-toast";

const PAGE_SIZE = 50;

export function WorkflowLogsPage() {
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState("");
  const [live, setLive] = React.useState(false);
  const { toast } = useToast();

  const {
    runs,
    pageInfo,
    isLoading,
    isRefreshing, // from hook (SWR isValidating)
    refresh,
    error,
    errorMessage,
  } = useWorkflowRuns({ page, limit: PAGE_SIZE, q: query.trim() || undefined });

  const [selected, setSelected] = React.useState<WorkflowRun | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Auto-polling; pause if an error occurs
  React.useEffect(() => {
    if (!live || error) return;
    const t = setInterval(() => {
      refresh().catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [live, error, refresh]);

  // Toast on error (once per change)
  React.useEffect(() => {
    if (!errorMessage) return;
    toast({
      title: "Error fetching workflow runs",
      description: errorMessage,
      variant: "destructive",
    });
    if (live) setLive(false);
  }, [errorMessage, toast, live]);

  const onRowClick = (run: WorkflowRun) => {
    setSelected(run);
    setSheetOpen(true);
  };

  const exportCSV = () => {
    try {
      if (!runs.length) return;
      const header = [
        "id",
        "workflow_id",
        "status",
        "started_at",
        "ended_at",
        "duration_ms",
        "trigger",
        "cost_usd",
      ];
      const rows = runs.map((r) => [
        r._id,
        r.workflow_id,
        r.status,
        r.started_at || r.createdAt || "",
        r.ended_at || r.updatedAt || "",
        r.metrics?.duration_ms ?? "",
        (r as any).trigger || "",
        r.cost_usd ?? "",
      ]);
      const csv = [header.join(","), ...rows.map((r) => r.map(csvSafe).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-runs-page${page}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message ?? "Could not generate CSV",
        variant: "destructive",
      });
    }
  };

  const isBusy = isLoading || isRefreshing;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={isBusy}>
            <RefreshCcw className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportCSV} disabled={!runs.length}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant={live ? "default" : "outline"}
            size="sm"
            onClick={() => setLive((v) => !v)}
            disabled={!!error}
            title={error ? "Fix errors to enable Live" : "Toggle Live"}
          >
            <Play className="h-4 w-4 mr-1" />
            Live
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4 max-w-xl">
        <Input
          placeholder="Search logs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Error banner */}
      {errorMessage ? <ErrorBanner message={errorMessage} onRetry={() => refresh()} /> : null}

      <Separator className="my-4" />

      {/* Table */}
      <LogsTable items={runs} onRowClick={onRowClick} />

      {/* Empty state (only when no error and not loading) */}
      {!error && !isLoading && runs.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">No runs found.</div>
      )}

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <span>
          Page {pageInfo?.page ?? page} · {runs.length} / {pageInfo?.total ?? "—"}
        </span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!pageInfo?.has_next}
        >
          Next
        </Button>
      </div>

      {/* Details Sheet */}
      <LogDetailsSheet open={sheetOpen} onOpenChange={setSheetOpen} run={selected} />
    </div>
  );
}

// escape commas/quotes/newlines for CSV
function csvSafe(v: unknown) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}