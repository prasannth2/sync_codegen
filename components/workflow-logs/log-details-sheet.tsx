// components/workflow-logs/log-details-sheet.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkflowRun } from "./types";
import { durationFrom, fmtMs, fmtTimeParts, statusTone } from "./format";
import { Eye, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";

export function LogDetailsSheet({
  open,
  onOpenChange,
  run,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  run: WorkflowRun | null;
}) {
  const { toast } = useToast();
  const { copied, copy } = useCopy();

  if (!run) return null;

  const st = statusTone(run.status);
  const { date, time } = fmtTimeParts(run.started_at || run.createdAt);
  const dur = run.metrics?.duration_ms ?? durationFrom(run.started_at, run.ended_at);

  const copyJSON = (label: string, value: unknown) => {
    copy(JSON.stringify(value ?? {}, null, 2));
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const copyText = (label: string, value?: string | null) => {
    copy(value || "");
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-5 pt-5 pb-3">
            <SheetHeader className="items-start">
              <SheetTitle>Log Details</SheetTitle>
              <SheetDescription className="sr-only">Workflow execution details</SheetDescription>
            </SheetHeader>
          </div>
          <Separator />
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-6">
          {/* Summary grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <KeyVal label="Timestamp">
              <div className="font-medium">{date}, {time}</div>
            </KeyVal>

            <KeyVal label="Workflow" align="right">
              <div className="truncate font-medium">
                {(run as any).workflow_name || run.workflow_id}
              </div>
            </KeyVal>

            <KeyVal label="Execution ID">
              <div className="flex items-center gap-2">
                <code className="text-xs break-all">{run._id}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyText("Execution ID", run._id)}
                  aria-label="Copy Execution ID"
                  title="Copy Execution ID"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </KeyVal>

            <KeyVal label="Level" align="right">
              <Badge variant={st.badge as any} className="capitalize">{st.text}</Badge>
            </KeyVal>

            <KeyVal label="Trigger">
              <div className="capitalize font-medium">{(run as any).trigger || "schedule"}</div>
            </KeyVal>

            <KeyVal label="Duration" align="right">
              <div className="font-medium">{fmtMs(dur)}</div>
            </KeyVal>
          </section>

          {/* Snapshot row */}
          <section className="rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">View Snapshot</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => copyJSON("Workflow snapshot", run.context_snapshot)}
              >
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>
          </section>

          {/* Execution details */}
          <section className="rounded-lg border">
            <div className="px-4 py-3 text-sm font-medium">Workflow Execution</div>
            <Separator />
            <div className="p-4 space-y-3">
              {(run.nodes ?? []).map((n) => {
                const nodeDur =
                  n.started_at && n.ended_at
                    ? new Date(n.ended_at).getTime() - new Date(n.started_at).getTime()
                    : undefined;

                return (
                  <div key={n.node_id} className="rounded-md border p-3">
                    {/* Node header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-6">
                          <span className="font-mono">{n.type}</span>{" "}
                          <span className="text-muted-foreground font-normal">({n.node_id})</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtMs(nodeDur)}
                      </div>
                    </div>

                    {/* Error / Info message */}
                    {n.error_message ? (
                      <div className="mt-2 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs leading-5">
                        {n.error_message}
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyJSON("Node input", n.input_preview)}>
                        Copy Input
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyJSON("Node output", n.output_preview)}>
                        Copy Output
                      </Button>
                      {n.error_stack ? (
                        <Button size="sm" variant="outline" onClick={() => copyText("Error stack", n.error_stack!)}>
                          Copy Stack
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {(run.nodes ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">No per-node details.</div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Key/Value row with consistent alignment.
 * - label sits in a fixed baseline area for tidy columns
 * - align="right" right-aligns the value (for duration/workflow on the right column)
 */
function KeyVal({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="grid grid-cols-[120px,1fr] items-start gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className={align === "right" ? "text-right" : ""}>{children}</div>
    </div>
  );
}