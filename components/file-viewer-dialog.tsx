"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Code, Edit3, Save, X, Loader2 } from "lucide-react";
import { ArtifactCodeViewer } from "./artifacts/artifact-code-viewer";

// ---- Types you already have in your codebase ----
// If these live elsewhere, remove these placeholders and import them instead.
export type ArtifactType = "code" | "schema" | "json" | "text" | string;
export type ArtifactResponse = {
    artifact_id: string;
    formatter_id: string;
    api_id: string;
    type: ArtifactType;
    version: string;
    content: string;
    meta?: { files?: { path: string; name: string }[] };
};

export type BasicFile = {
    artifact_id: string;
    name: string;
    content: string;
};

export interface FilesViewerDialogProps {
    /** Controls dialog visibility */
    open: boolean;
    /** onOpenChange from Radix/ShadCN Dialog */
    onOpenChange: (open: boolean) => void;

    /** Array of raw files to render */
    files: BasicFile[];

    /** IDs used to build ArtifactResponse for the viewer */
    formatterId: string;
    apiId: string;

    /** Infer artifact type from a filename (pass your existing util) */
    inferArtifactType: (filename: string) => ArtifactType;

    /** Optional title override */
    title?: string;

    /** Optional footer content (e.g., extra actions) */
    footerRightSlot?: React.ReactNode;

    /**
     * Save handler invoked for single-file save and save-all.
     * Return value determines UI states; throw to surface an error.
     */
    onSave?: (args: {
        artifactId: string;
        fileName: string;
        content: string;
        formatterId: string;
        apiId: string;
    }) => Promise<{ ok: boolean; message?: string } | void>;

    /** Optional custom renderer to replace the default ArtifactCodeViewer */
    renderArtifact?: (artifact: ArtifactResponse) => React.ReactNode;
}

/**
 * FilesViewerDialog (with inline edit & save)
 *
 * A reusable dialog to preview and EDIT generated artifacts/files with your
 * existing <ArtifactCodeViewer/> and a fallback monospace editor.
 */
export default function FilesViewerDialog({
    open,
    onOpenChange,
    files,
    formatterId,
    apiId,
    inferArtifactType,
    title = "Generated Artifacts",
    footerRightSlot,
    renderArtifact,
    onSave,
}: FilesViewerDialogProps) {
    // Local editable state per file-id
    const [drafts, setDrafts] = React.useState<Record<string, string>>({});
    const [editing, setEditing] = React.useState<Record<string, boolean>>({});
    const [saving, setSaving] = React.useState<Record<string, boolean>>({});
    const [messages, setMessages] = React.useState<Record<string, { type: "success" | "error"; text: string }>>({});
    const [filter, setFilter] = React.useState("");

    // Build artifacts
    const artifacts = React.useMemo<ArtifactResponse[]>(() => {
        return (files || []).map((file) => ({
            artifact_id: file.artifact_id,
            formatter_id: formatterId ?? "",
            api_id: apiId ?? "",
            type: inferArtifactType(file.name),
            version: "1.0.0",
            content: file.content,
            meta: { files: [{ path: file.name, name: file.name }] },
        }));
    }, [files, formatterId, apiId, inferArtifactType]);

    // Filter by filename
    const visibleArtifacts = React.useMemo(() => {
        if (!filter.trim()) return artifacts;
        const q = filter.toLowerCase();
        return artifacts.filter((a) => a.meta?.files?.some((f) => f.name.toLowerCase().includes(q)));
    }, [artifacts, filter]);

    // Reset state when files change or dialog closes
    React.useEffect(() => {
        if (!open) {
            setDrafts({});
            setEditing({});
            setSaving({});
            setMessages({});
            setFilter("");
        }
    }, [open, files]);

    // Keyboard: Cmd/Ctrl+S to save all when editing any
    React.useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
            if (isSave) {
                e.preventDefault();
                handleSaveAll();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const setDraftFor = React.useCallback((id: string, content: string) => {
        setDrafts((d) => ({ ...d, [id]: content }));
    }, []);

    const toggleEdit = React.useCallback((id: string, next?: boolean) => {
        setEditing((e) => ({ ...e, [id]: typeof next === "boolean" ? next : !e[id] }));
        // Seed draft with current content if entering edit mode
        if (!editing[id]) {
            const current = artifacts.find((a) => a.artifact_id === id)?.content ?? drafts[id] ?? "";
            setDraftFor(id, current);
        }
    }, [editing, artifacts, drafts, setDraftFor]);

    const handleSaveOne = React.useCallback(async (a: ArtifactResponse) => {
        if (!onSave) return;
        const id = a.artifact_id;
        const content = drafts[id] ?? a.content;
        try {
            setSaving((s) => ({ ...s, [id]: true }));
            const res = await onSave({
                artifactId: id,
                fileName: a.meta?.files?.[0]?.name ?? "",
                content,
                formatterId,
                apiId,
            });
            setMessages((m) => ({ ...m, [id]: { type: "success", text: res && "message" in (res as any) && (res as any).message ? (res as any).message! : "Saved" } }));
            // Replace original content on success
            setDraftFor(id, content);
            setEditing((e) => ({ ...e, [id]: false }));
        } catch (err: any) {
            setMessages((m) => ({ ...m, [id]: { type: "error", text: err?.message || "Save failed" } }));
        } finally {
            setSaving((s) => ({ ...s, [id]: false }));
        }
    }, [onSave, drafts, formatterId, apiId, setDraftFor]);

    const handleSaveAll = React.useCallback(async () => {
        if (!onSave) return;
        const dirty = visibleArtifacts.filter((a) => drafts[a.artifact_id] !== undefined && drafts[a.artifact_id] !== a.content);
        if (dirty.length === 0) return;
        await Promise.all(
            dirty.map((a) => handleSaveOne(a))
        );
    }, [onSave, visibleArtifacts, drafts, handleSaveOne]);

    const renderViewer = (artifact: ArtifactResponse) => {
        const id = artifact.artifact_id;
        const isEditing = !!editing[id];
        const isSaving = !!saving[id];
        const msg = messages[id];
        const name = artifact.meta?.files?.[0]?.name ?? artifact.artifact_id;

        return (
            <div key={id} className="flex flex-col min-h-[520px] rounded-2xl border bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">{name}</Badge>
                        {msg && (
                            <span className={`text-xs ${msg.type === "error" ? "text-destructive" : "text-green-600"}`}>
                                {msg.type === "error" ? "✖" : "✔"} {msg.text}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => toggleEdit(id)}>
                                <Edit3 className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="cursor-pointer"
                                    onClick={() => handleSaveOne(artifact)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                    Save
                                </Button>
                                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => toggleEdit(id, false)}>
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-h-[460px]">
                    {
                        renderArtifact ? (
                            renderArtifact(artifact)
                        ) : (
                            <ArtifactCodeViewer artifact={artifact} readOnly={!isEditing} onChange={(val) => setDraftFor(id, val)}/>
                        )
                    }
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] max-h-[88vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Input
                        placeholder="Filter by file name…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="cursor-pointer"
                            onClick={handleSaveAll}
                            disabled={!onSave}
                        >
                            <Save className="w-4 h-4 mr-1" /> Save All (⌘/Ctrl+S)
                        </Button>
                    </div>
                </div>

                {visibleArtifacts.length > 0 ? (
                    <div className="grid gap-6 grid-cols-1">
                        {visibleArtifacts.map((artifact) => renderViewer(artifact))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No artifacts to display.</p>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    {footerRightSlot}
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
