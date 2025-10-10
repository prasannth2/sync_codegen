// components/code-runner/code-runner-dialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  FileCode2,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  PencilLine,
  Save,
  X,
  Copy,
} from "lucide-react";

import { ArtifactCodeViewer } from "@/components/artifacts/artifact-code-viewer";
import { TerminalLog, type LogLine } from "@/components/terminal-log";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";
import { API_BASE_URL } from "@/lib/utils/env";
import { joinUrl } from "@/lib/utils/url";
import { fetcher as commonFetcher } from "@/lib/utils";

/* ----------------------------- Types & Props ----------------------------- */

export type ArtifactType = "code" | "schema" | "json" | "text" | string;
export type BasicFile = { artifact_id: string; name: string; content: string };

type RunApiShape =
  | { logs?: LogLine[]; output?: unknown }
  | { status: number; data?: { mapped_output?: unknown }; logs?: LogLine[] };

export interface CodeRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  files: BasicFile[];
  formatterId?: string;
  apiId?: string;

  inferArtifactType: (filename: string) => ArtifactType;

  /** Optional: override the default POST /api/test/run */
  sampleRequest?: any;
  runUrl?: string;
  buildRunBody?: (args: {
    artifactId: string;
    fileName: string;
    content: string;
    stdin?: string;
    formatterId?: string;
    apiId?: string;
  }) => any;
  buildRunInit?: (body: any) => RequestInit;

  /** Optional save support (not required to Run edited code) */
  onSave?: (args: {
    artifactId: string;
    fileName: string;
    content: string;
  }) => Promise<{ ok: boolean; message?: string } | void>;

  title?: string;
}

/* --------------------------------- Utils -------------------------------- */

function safeParse(s?: string) {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/* ------------------------------ Main Component --------------------------- */

export function CodeRunnerDialog({
  open,
  onOpenChange,
  files,
  formatterId,
  apiId,
  inferArtifactType,
  sampleRequest,
  runUrl = "/api/test/runcode",
  buildRunBody,
  buildRunInit,
  onSave,
  title = "Generated Artifacts",
}: CodeRunnerDialogProps) {
  const { toast } = useToast();
  const { copied, copy } = useCopy();

  const artifacts = React.useMemo(
    () =>
      (files || []).map((f) => ({
        artifact_id: f.artifact_id,
        type: inferArtifactType(f.name),
        content: f.content,
        name: f.name,
      })),
    [files, inferArtifactType]
  );

  const [activeId, setActiveId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setActiveId((p) => p ?? artifacts[0]?.artifact_id ?? null);
  }, [artifacts]);

  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const current = React.useMemo(
    () => artifacts.find((a) => a.artifact_id === activeId) ?? null,
    [activeId, artifacts]
  );

  const [stdinOpen, setStdinOpen] = React.useState(false);
  const [stdin, setStdin] = React.useState<string>(() =>
    typeof sampleRequest === "string"
      ? sampleRequest
      : sampleRequest != null
      ? JSON.stringify(sampleRequest, null, 2)
      : ""
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [output, setOutput] = React.useState<unknown>(null);
  const [tab, setTab] = React.useState<"output" | "logs">("logs");

  React.useEffect(() => {
    if (!open) {
      setEditing(false);
      setSaving(false);
      setDrafts({});
      setIsRunning(false);
      setLogs([]);
      setOutput(null);
      setStdinOpen(false);
      setTab("logs");
    }
  }, [open]);

  React.useEffect(() => {
    const next =
      typeof sampleRequest === "string"
        ? sampleRequest
        : sampleRequest != null
        ? JSON.stringify(sampleRequest, null, 2)
        : "";
    setStdin(next);
  }, [sampleRequest]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && key === "enter") {
        e.preventDefault();
        void handleRun();
      }
      if (cmd && key === "s" && onSave && editing) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing, current, drafts, stdin, onSave]);

  const currentName = current?.name ?? current?.artifact_id ?? "";
  const currentContent = current ? drafts[current.artifact_id] ?? current.content : "";

  const toggleEdit = (next?: boolean) => {
    if (!current) return;
    const will = typeof next === "boolean" ? next : !editing;
    if (will && drafts[current.artifact_id] == null) {
      setDrafts((d) => ({ ...d, [current.artifact_id]: current.content }));
    }
    setEditing(will);
  };

  const handleSave = async () => {
    if (!onSave || !current) return;
    try {
      setSaving(true);
      const res = await onSave({
        artifactId: current.artifact_id,
        fileName: currentName,
        content: currentContent,
      });
      toast({
        title: "Saved",
        description: (res as any)?.message ?? "File saved.",
      });
      setEditing(false);
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Could not save file.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const makeBody = React.useCallback(
    (payload: {
      artifactId: string;
      fileName: string;
      content: string;
      stdin?: string;
      formatterId?: string;
      apiId?: string;
    }) =>
      buildRunBody
        ? buildRunBody(payload)
        : {
            artifact_id: payload.artifactId,
            file_name: payload.fileName,
            content: payload.content,
            sample_request: payload.stdin ? safeParse(payload.stdin) ?? payload.stdin : undefined,
            input: payload.stdin ? safeParse(payload.stdin) ?? payload.stdin : undefined,
            formatter_id: payload.formatterId,
            api_id: payload.apiId,
            options: { validate_schema: false, run_model_shape_check: false },
          },
    [buildRunBody]
  );

  const makeInit = React.useCallback(
    (body: any): RequestInit =>
      buildRunInit
        ? buildRunInit(body)
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    [buildRunInit]
  );

  const normalizeResult = (res: RunApiShape) => {
    const asAny = res as any;
    const outputNorm = asAny?.data?.mapped_output ?? asAny?.data ?? null;
    const logsArr = (asAny?.logs as LogLine[]) ?? [];
    return { output: outputNorm, logs: logsArr };
  };

  const handleRun = async () => {
    if (!current || isRunning) return;
    setIsRunning(true);
    setOutput(null);
    setTab("logs");
    setLogs((l) => [
      { level: "info", message: "Starting run…", ts: new Date().toISOString() },
    ]);

    try {
      const body = makeBody({
        artifactId: current.artifact_id,
        fileName: currentName,
        content: currentContent,
        stdin,
        formatterId,
        apiId,
      });

      const url = joinUrl(API_BASE_URL, `${runUrl.replace(/^\/+/, "")}`);

      const res = await fetch(url, makeInit(body));
      if (!res.ok) throw new Error(`Run failed (${res.status})`);
      const json = (await res.json()) as RunApiShape;

      const { logs: newLogs, output: out } = normalizeResult(json);
      if (Array.isArray(newLogs) && newLogs.length) setLogs(newLogs);
      if (out !== undefined) {
        setOutput(out);
        setTab("output");
      }
      toast({ title: "Run finished", description: "Execution completed." });
    } catch (err: any) {
      setLogs((l) => [
        ...l,
        { level: "error", message: err?.message ?? "Run failed", ts: new Date().toISOString() },
      ]);
      setTab("logs");
      toast({
        title: "Run failed",
        description: err?.message ?? "Error while running.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const prettyOutput =
    typeof output === "string" ? output : output != null ? JSON.stringify(output, null, 2) : "";

  const copyOutput = () => {
    copy(prettyOutput || "");
    toast({ title: "Copied", description: "Output copied to clipboard." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-[96vw] lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] h-[88vh] p-0 overflow-y-auto">
        {/* Sticky header */}
        <div className="px-5 pt-5 pb-0 bg-background/80 backdrop-blur sticky top-0 z-20">
          <DialogHeader className="flex flex-row items-center justify-between p-0">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileCode2 className="w-5 h-5" />
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => setStdinOpen((v) => !v)}
                title={stdinOpen ? "Hide Input" : "Show Input"}
              >
                {stdinOpen ? (
                  <ChevronUp className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-1" />
                )}{" "}
                Input
              </Button>
              <Button
                onClick={handleRun}
                disabled={!current || isRunning}
                className="min-w-[124px] cursor-pointer"
              >
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isRunning ? "Running…" : "Run (⌘/Ctrl+Enter)"}
              </Button>
              <Button
                className="cursor-pointer"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          {isRunning ? (
            <div className="mt-3 h-1 w-full overflow-hidden rounded bg-muted">
              <div className="h-full w-1/3 animate-[indeterminate_1.4s_infinite] bg-primary" />
            </div>
          ) : null}
        </div>

        {/* Optional stdin drawer */}
        {stdinOpen && (
          <>
            <div className="px-5 py-1">
              <div className="mb-2 text-sm font-medium">Run Input (stdin / sample JSON)</div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="w-full min-h-[120px] rounded-md border bg-background font-mono text-xs p-3"
                placeholder='{"foo":"bar"}'
              />
            </div>
            <Separator />
          </>
        )}

        {/* Main: unified frame */}
        <div className="flex-1 h[calc(88vh-150px)] px-5 py-1 min-w-0">
          <div className="h-full overflow-y-auto rounded-xl border">
            <ResizablePanelGroup direction="horizontal" className="h-full min-w-0">
              {/* LEFT — Editor */}
              <ResizablePanel defaultSize={70} minSize={40} className="min-w-0">
                <div className="h-full flex flex-col min-w-0">
                  {/* Top bar mirrors right side height */}
                  <div className="flex items-center justify-between min-h-[44px] px-3 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-2 max-w-[65%]">
                      <div className="text-xs text-muted-foreground">File</div>
                      <select
                        value={activeId ?? ""}
                        onChange={(e) => setActiveId(e.target.value)}
                        className="max-w-full truncate bg-background border rounded px-2 py-1 text-xs"
                        aria-label="Select file"
                      >
                        {artifacts.map((a) => (
                          <option key={a.artifact_id} value={a.artifact_id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edit / Save / Cancel */}
                    <div className="flex items-center gap-2">
                      {!editing ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => toggleEdit(true)}
                        >
                          <PencilLine className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <>
                          {onSave ? (
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                              {saving ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Save
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => toggleEdit(false)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 min-h-0 mt-1">
                    {current ? (
                      <ArtifactCodeViewer
                        artifact={{
                          artifact_id: current.artifact_id,
                          formatter_id: "",
                          api_id: "",
                          type: current.type,
                          version: "1.0.0",
                          content: currentContent,
                          meta: { files: [{ path: current.name, name: current.name }] },
                        }}
                        readOnly={!editing}
                        onChange={(val) =>
                          setDrafts((d) => ({ ...d, [current.artifact_id]: val }))
                        }
                      />
                    ) : (
                      <div className="h-full grid place-items-center text-sm text-muted-foreground">
                        No file selected.
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="data-[panel-group-direction=horizontal]:mx-0" />

              {/* RIGHT — Output / Logs */}
              <ResizablePanel defaultSize={30} minSize={24} className="min-w-0">
                <div className="h-full flex flex-col min-w-0">
                  <div className="flex items-center min-h-[44px] px-3 py-2 border-b bg-muted/30">
                    <Tabs
                      value={tab}
                      onValueChange={(v) => setTab(v as any)}
                      className="w-full h-full"
                    >
                      <TabsList className="w-full justify-start gap-2">
                        <TabsTrigger className="cursor-pointer" value="output">
                          Output
                        </TabsTrigger>
                        <TabsTrigger className="cursor-pointer" value="logs">
                          Logs
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex-1 min-h-0 min-w-0">
                    <Tabs value={tab} className="h-full">
                      <TabsContent value="output" className="h-full m-0 p-0">
                        <div className="h-full p-3 flex flex-col gap-2">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyOutput}
                              disabled={!prettyOutput}
                              className="cursor-pointer"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              {copied ? "Copied" : "Copy"}
                            </Button>
                          </div>
                          <textarea
                            readOnly
                            value={prettyOutput}
                            placeholder="Output will appear here after run…"
                            className="w-full flex-1 rounded-lg border bg-muted font-mono text-xs p-3 resize-none"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="logs" className="h-full m-0 p-0">
                        <div className="h-full p-3 flex flex-col min-h-0 min-w-0">
                          <TerminalLog logs={logs} height="100%" />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CodeRunnerDialog;