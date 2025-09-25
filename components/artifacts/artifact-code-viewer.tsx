"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Copy, Download, WrapText, FileCode2 } from "lucide-react";

export function inferArtifactType(filename?: string): "mapper_code" | "schema" | "mongoose_model" | "mapper" | "unknown" {
  const n = (filename || "").toLowerCase();
  if (n.includes("schema") || n.endsWith(".json")) return "schema";
  if (n.includes("mongoose") || n.includes("model")) return "mongoose_model";
  if (n.includes("mapper")) return "mapper_code";
  return "unknown";
}


// Types you get from /api/artifacts/:id
export type ArtifactResponse = {
  artifact_id: string;
  formatter_id: string;
  api_id: string;
  type: string; // "mapper_code" | "schema" | "mongoose_model" | ...
  version?: string;
  content: string;
  meta?: {
    hash?: string;
    tool?: string;
    model?: string;
    provider?: string;
    notes?: string;
    files?: { path: string; name: string }[];
    api_id?: string;
    api_key?: string;
    formatter_key?: string;
    formatter_name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type Language = "javascript" | "typescript" | "json";

export interface ArtifactCodeViewerProps {
  artifact: ArtifactResponse;
  language?: Language; // default inferred from type/meta/filename
  filenameHint?: string; // fallback filename for downloads
  // When you want to allow changing language manually (rare)
  allowLanguageSwitch?: boolean;
}

/**
 * A lightweight code viewer with:
 * - Line numbers
 * - Copy to clipboard
 * - Soft wrap toggle
 * - Download as file
 * - Optional Monaco editor (if @monaco-editor/react is installed)
 *
 * Works with "content" returned by /api/artifacts/:id.
 */
export function ArtifactCodeViewer({
  artifact,
  language,
  filenameHint,
  allowLanguageSwitch = false,
}: ArtifactCodeViewerProps) {
  const [wrap, setWrap] = useState(false);
  const [lang, setLang] = useState<Language>(language ?? guessLanguage(artifact));
  const [useMonaco, setUseMonaco] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Try to lazy-load Monaco editor if available (optional enhancement)
  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const mod = await import("@monaco-editor/react");
        if (!canceled && mod?.default) {
          setMonacoEditor(() => mod.default);
          setUseMonaco(true);
        }
      } catch {
        // If not installed, silently fall back to plain viewer
        setUseMonaco(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  const filename = useMemo(() => {
    // Prefer meta.files[0].name -> derive from type -> fallback
    const fromMeta =
      artifact?.meta?.files?.[0]?.name ||
      (artifact.type === "mapper_code" ? "mapper.js" : null) ||
      (artifact.type === "mongoose_model" ? "model.js" : null) ||
      (artifact.type === "schema" ? "schema.json" : null);

    const base =
      filenameHint ||
      fromMeta ||
      (lang === "json" ? "artifact.json" : lang === "typescript" ? "artifact.ts" : "artifact.js");
    return sanitizeFilename(base);
  }, [artifact?.meta?.files, artifact.type, filenameHint, lang]);

  const code = artifact?.content ?? "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Copied", description: "Artifact content copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not download file.", variant: "destructive" });
    }
  };

  return (
    <div className="w-full h-full flex flex-col border border-border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-4 h-4 shrink-0" />
          <div className="truncate">
            <div className="text-sm font-medium truncate">{filename}</div>
            <div className="text-xs text-muted-foreground truncate">
              {artifact.type} • v{artifact.version ?? "1.0.0"} • {artifact.artifact_id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allowLanguageSwitch && (
            <div className="hidden md:flex items-center gap-2">
              <Label htmlFor="lang" className="text-xs">Lang</Label>
              <select
                id="lang"
                className="text-xs border border-input rounded px-2 py-1 bg-background"
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
              >
                <option value="javascript">javascript</option>
                <option value="typescript">typescript</option>
                <option value="json">json</option>
              </select>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setWrap((w) => !w)} title="Toggle wrap">
            <WrapText className="w-4 h-4 mr-2" />
            {wrap ? "Unwrap" : "Wrap"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopy} title="Copy">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div ref={containerRef} className="flex-1 min-h-[300px]">
        {useMonaco && MonacoEditor ? (
          <MonacoEditor
            height="100%"
            defaultLanguage={lang === "json" ? "json" : lang === "typescript" ? "typescript" : "javascript"}
            value={code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: wrap ? "on" : "off",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <PlainCodeViewer code={code} wrap={wrap} />
        )}
      </div>
    </div>
  );
}

/** Fallback plain viewer with line numbers (no deps). */
function PlainCodeViewer({ code, wrap }: { code: string; wrap: boolean }) {
  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <div className="w-full h-full overflow-auto font-mono text-sm">
      <table className="w-full border-separate border-spacing-0">
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} className="align-top">
              <td className="select-none sticky left-0 bg-muted/40 text-muted-foreground pr-3 pl-3 border-r border-border text-right w-[3.5rem]">
                {idx + 1}
              </td>
              <td className={`pl-3 pr-3 py-[2px] ${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}>
                {line.length ? line : "\u200B"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Try to infer a sensible language from type / file name / content. */
function guessLanguage(artifact: ArtifactResponse): Language {
  const name = artifact?.meta?.files?.[0]?.name?.toLowerCase?.() || "";
  if (name.endsWith(".ts")) return "typescript";
  if (name.endsWith(".json")) return "json";

  // based on type
  if (artifact.type === "schema") return "json";
  if (artifact.type === "mapper_code" || artifact.type === "mongoose_model") {
    // peek first char to spot JSON vs JS
    const trimmed = artifact.content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    return "javascript";
  }

  // fallback
  return "javascript";
}

function sanitizeFilename(s: string) {
  return s.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 120);
}