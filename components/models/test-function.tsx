"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FlaskConical, Loader2 } from "lucide-react";
import { TerminalLog, type LogLine } from "@/components/terminal-log";
import clsx from "clsx";
import { AutoGrowTextarea } from "../auto-grow-textarea";

type TestFunctionProProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  testInput: string;
  onChangeTestInput: (val: string) => void;

  testOutput: string;
  isTesting?: boolean;
  onExecute: () => void;

  logs: LogLine[];
  onClearLogs?: () => void;

  // IDs to persist per-function layout
  persistenceKey?: string; // e.g., `test-dialog:${apiId}`
  title?: string;
  dialogMaxWidthClass?: string;
};

const DEFAULT_SIZES = [38, 36, 26]; // Input | Output | Logs

export function TestFunctionPro({
  open,
  onOpenChange,
  testInput,
  onChangeTestInput,
  testOutput,
  isTesting = false,
  onExecute,
  logs,
  onClearLogs,
  persistenceKey = "test-dialog:default",
  title = "Test Function",
  dialogMaxWidthClass = "sm:max-w-[98vw] md:max-w-[1400px]",
}: TestFunctionProProps) {
  // Persist panel sizes per function
  const [sizes, setSizes] = React.useState<number[]>(
    () => {
      if (typeof window === 'undefined' || !persistenceKey) return DEFAULT_SIZES;
      return JSON.parse(localStorage.getItem(persistenceKey) || "null") ?? DEFAULT_SIZES
    }
  );
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(persistenceKey, JSON.stringify(sizes));
    }
  }, [persistenceKey, sizes]);

  // Auto-expand logs while executing
  const prevSizesRef = React.useRef<number[] | null>(null);
  React.useEffect(() => {
    if (isTesting) {
      prevSizesRef.current = sizes;
      // grow logs to ~45% without collapsing others too much
      const growLogs = normalizeTo100([Math.max(24, sizes[0] - 4), Math.max(24, sizes[1] - 5), 52]);
      setSizes(growLogs);
    } else if (prevSizesRef.current) {
      setSizes(prevSizesRef.current);
      prevSizesRef.current = null;
    }
  }, [isTesting]); // eslint-disable-line

  // Shortcut: Cmd/Ctrl + Enter
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        if (!isTesting && testInput) onExecute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isTesting, testInput, onExecute]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={clsx(
          "w-full", dialogMaxWidthClass,
          "h-[88vh] p-0 overflow-auto",
          "flex flex-col"
        )}
      >
        {/* Sticky Header */}
        <div className="px-5 pt-5 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
          <DialogHeader className="flex flex-row items-center justify-between p-0">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <FlaskConical className="w-5 h-5" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={onExecute}
                disabled={!testInput || !!isTesting}
                className="min-w-[142px] cursor-pointer"
              >
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                {isTesting ? "Running…" : "Execute Test"}
              </Button>
              <Button className="cursor-pointer" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </DialogHeader>

          {/* Inline progress bar */}
          {isTesting ? (
            <div className="mt-3 h-1 w-full overflow-hidden rounded bg-muted">
              <div className="h-full w-1/3 animate-[indeterminate_1.5s_infinite] bg-primary" />
            </div>
          ) : null}
        </div>

        <Separator />

        {/* Desktop: 3 resizable columns */}
        <div className="hidden md:block flex-1 px-4 py-4">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-lg border"
            onLayout={(vals) => setSizes(vals)} // shadcn passes percentages that sum to 100
          >
            <ResizablePanel defaultSize={sizes[0]} minSize={18}>
              <section className="h-full flex flex-col p-3">
                <Label className="mb-2 text-sm font-medium">Sample Input</Label>
                <Textarea
                  value={testInput}
                  onChange={(e) => onChangeTestInput(e.target.value)}
                  className="font-mono text-xs md:text-sm resize-none h-full"
                  placeholder="Enter test JSON input..."
                />
              </section>
            </ResizablePanel>
            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={sizes[1]} minSize={18}>
              <section className="h-full flex flex-col p-3 overflow-y-auto">
                <Label className="mb-2 text-sm font-medium">Generated Output</Label>
                <Textarea
                  value={testOutput}
                  readOnly
                  className="font-mono text-xs md:text-sm resize-none h-full bg-muted overflow-y-auto"
                  placeholder="Output will appear here after test execution..."
                />

                {/* <AutoGrowTextarea
                  id="sample-response"
                  placeholder="Output will appear here after test execution..."
                  value={testOutput}
                  onBlur={undefined}
                  spellCheck={false}
                  minRows={16}
                  className={`font-mono text-sm`}
                /> */}
              </section>
            </ResizablePanel>
            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={sizes[2]} minSize={16}>
              <section className="h-full flex flex-col p-3">
                <TerminalLog logs={logs} height="100%" />
              </section>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile: Tabs (no scroll hell) */}
        <div className="md:hidden flex-1 px-4 py-4">
          <Tabs defaultValue="input" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <div className="mt-3 flex-1 overflow-auto">
              <TabsContent value="input" className="m-0 h-full">
                <Label className="mb-2 block text-sm font-medium">Sample Input</Label>
                <Textarea
                  value={testInput}
                  onChange={(e) => onChangeTestInput(e.target.value)}
                  className="font-mono text-xs min-h-[220px]"
                />
              </TabsContent>
              <TabsContent value="output" className="m-0 h-full">
                <Label className="mb-2 block text-sm font-medium">Generated Output</Label>
                <Textarea
                  value={testOutput}
                  readOnly
                  className="font-mono text-xs min-h-[220px] bg-muted"
                />
              </TabsContent>
              <TabsContent value="logs" className="m-0 h-full">
                <TerminalLog logs={logs} height={260} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- helpers ---
function normalizeTo100(vals: number[]) {
  const total = vals.reduce((a, b) => a + b, 0);
  return vals.map(v => Math.max(0, (v / total) * 100));
}