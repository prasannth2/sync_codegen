// components/workflow-logs/LogsTable.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkflowRun } from "./types";
import { durationFrom, fmtMs, fmtTimeParts, fmtUSD, statusTone, triggerTone } from "./format";

export function LogsTable({
  items,
  onRowClick,
  className,
}: {
  items: WorkflowRun[];
  onRowClick: (run: WorkflowRun) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Time</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead className="w-[120px]">Cost</TableHead>
            <TableHead className="w-[140px]">Trigger</TableHead>
            <TableHead className="w-[120px]">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const { date, time } = fmtTimeParts(it.started_at || it.createdAt);
            const dur = it.metrics?.duration_ms ?? durationFrom(it.started_at, it.ended_at);
            const st = statusTone(it.status);
            const tr = triggerTone(it.trigger);
            return (
              <TableRow
                key={it._id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onRowClick(it)}
              >
                <TableCell className="font-medium">
                  <div className="text-xs text-muted-foreground">{date}</div>
                  <div className="text-sm font-semibold">{time}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={st.badge as any} className="capitalize">
                    {st.text}
                  </Badge>
                </TableCell>
                <TableCell className="truncate">{(it as any).workflow_name || "—"}</TableCell>
                <TableCell>{fmtUSD(it.cost_usd ?? 0.001)}</TableCell>
                <TableCell>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${tr.className}`}>
                    {tr.text}
                  </span>
                </TableCell>
                <TableCell>{fmtMs(dur)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {items.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">No runs found.</div>
      )}
    </div>
  );
}