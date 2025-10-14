// components/workflow-logs/log-details-sheet.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkflowRun } from "./types";
import { durationFrom, fmtMs, fmtTimeParts, statusTone } from "./format";
import { Eye, Copy, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";
import { TerminalLog } from "../terminal-log";

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
              <SheetTitle>
                <div className="w-full flex justify-between items-center gap-3">
                  <span>Log Details</span>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 ml-auto"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetTitle>
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

          {/* Execution details */}
          <section className="rounded-lg border">
            <div className="p-4 space-y-3">
              <TerminalLog logs={[{
                ts: run.createdAt,
                level: "warn",
                args: run.error_stack ? [run.error_stack] : ["No logs available."]
              }]} height="100%" />
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
    <div className="flex justify-between items-start gap-4">
      <div className="text-muted-foreground min-w-[120px]">{label}</div>
      <div
        className={
          align === "right"
            ? "flex-1 text-right font-medium break-words"
            : "flex-1 font-medium break-words"
        }
      >
        {children}
      </div>
    </div>
  );
}