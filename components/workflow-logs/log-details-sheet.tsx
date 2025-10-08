// components/workflow-logs/LogDetailsSheet.tsx
"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Details</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Timestamp</div>
              <div className="font-medium">{date}, {time}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Workflow</div>
              <div className="font-medium">{(run as any).workflow_name || run.workflow_id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Execution ID</div>
              <div className="flex items-center gap-2">
                <code className="text-xs">{run._id}</code>
                <Button size="icon" variant="ghost" onClick={() => copyText("Execution ID", run._id)} className="h-7 w-7">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Level</div>
              <Badge variant={st.badge as any} className="capitalize">{st.text}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Trigger</div>
              <div className="font-medium capitalize">{(run as any).trigger || "schedule"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">{fmtMs(dur)}</div>
            </div>
          </div>

          {/* Snapshot */}
          <div className="rounded-lg border">
            <button
              className="w-full flex items-center justify-between px-4 py-3"
              onClick={() => copyJSON("Workflow snapshot", run.context_snapshot)}
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">View Snapshot</span>
              </div>
              <span className="text-xs text-muted-foreground">{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>

          {/* Execution section */}
          <div className="rounded-lg border">
            <div className="px-4 py-3 text-sm font-medium">Workflow Execution</div>
            <Separator />
            <div className="p-4 space-y-3">
              {(run.nodes ?? []).map((n) => (
                <div key={n.node_id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{n.type} <span className="text-muted-foreground">({n.node_id})</span></div>
                    <div className="text-xs text-muted-foreground">
                      {fmtMs(n.started_at && n.ended_at ? new Date(n.ended_at).getTime() - new Date(n.started_at).getTime() : undefined)}
                    </div>
                  </div>
                  {n.error_message ? (
                    <div className="mt-2 rounded bg-destructive/10 text-destructive p-2 text-xs">
                      {n.error_message}
                    </div>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyJSON("Node input", n.input_preview)}>Copy Input</Button>
                    <Button size="sm" variant="outline" onClick={() => copyJSON("Node output", n.output_preview)}>Copy Output</Button>
                    {n.error_stack ? (
                      <Button size="sm" variant="outline" onClick={() => copyText("Error stack", n.error_stack!)}>Copy Stack</Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {(run.nodes ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">No per-node details.</div>
              )}
            </div>
          </div>

          {/* Cost breakdown placeholder (if you add costs later) */}
          {/* ... */}
        </div>
      </SheetContent>
    </Sheet>
  );
}