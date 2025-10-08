"use client";

import React, { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HardBreak from "@tiptap/extension-hard-break";

import { Badge } from "@/components/ui/badge";
import { textToHtml } from "@/lib/utils/editor";
import { MentionHighlight } from "./editors/mention-highlight";
import { Group, Item, ApiRec, FunctionRec, ModelRec, Mention, SlashGroup, SlashItem } from "@/lib/types/editor";
import { AtMenu } from "./editors/at-menu";

import { modelsFromMeta } from "@/lib/types/meta-models-adapter";

import { SlashFields } from "./editors/slash-fields";

export type InstructionEditorProps = {
  mappingInstructions: string;
  setMappingInstructions: (val: string) => void;
  inputSampleData?: any;
  outputSampleData?: any;
  onMentionsChange?: (mentions: Mention[]) => void;
};

/* ---------- Data fetch ---------- */
const fetcher = async (url: string) => {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
};

/* ---------- tiny helpers for slash menu (input/output fields) ---------- */
type FieldPath = { path: string; valueType: string };
const inferType = (v: any): string =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

function extractJsonPaths(obj: any, prefix = ""): FieldPath[] {
  const out: FieldPath[] = [];
  const add = (p: string, v: any) => out.push({ path: p, valueType: inferType(v) });

  const walk = (node: any, base: string) => {
    if (node === null || typeof node !== "object") {
      if (base) add(base, node);
      return;
    }
    if (Array.isArray(node)) {
      if (base) add(base, node);
      if (node.length > 0) walk(node[0], base ? `${base}[0]` : "[0]");
      return;
    }
    const keys = Object.keys(node);
    if (!keys.length) {
      if (base) add(base, node);
      return;
    }
    for (const k of keys) {
      const next = base ? `${base}.${k}` : k;
      walk(node[k], next);
    }
  };

  if (prefix) walk(obj, prefix);
  else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) walk(obj[k], k);
  } else add(prefix || "value", obj);

  return out;
}

/* ---------- Main controlled component ---------- */
export default function InstructionEditor({
  mappingInstructions,
  setMappingInstructions,
  onMentionsChange,
  inputSampleData,
  outputSampleData,
}: InstructionEditorProps) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const { data, isLoading } = useSWR(
    base ? `${base}/api/meta?includeCounts=true` : null,
    fetcher
  );

  // Build groups from API (for @ menu)
  const groups: Group[] = useMemo(() => {
    const apis: Item[] =
      data?.data?.apis?.map((a: any) => ({
        id: a._id,
        key: a.key,
        name: a.name,
        description: a.key || a._id,
        kind: "api" as const,
      })) ?? [];

    const funcs: Item[] =
      data?.data?.functions?.map((f: any) => ({
        id: f._id,
        key: f.key,
        name: f.name,
        description: f.api_id ? `api: ${f.api_id}` : f.key,
        kind: "function" as const,
      })) ?? [];

    const models: Item[] =
      data?.data?.models?.map((m: any) => ({
        name: m.name,
        collectionName: m.collectionName,
        description: m.collectionName ? `collection: ${m.collectionName}` : m.type,
        kind: "model" as const,
      })) ?? [];

    return [
      { key: "api", title: "APIs", items: apis },
      // { key: "function", title: "Functions", items: funcs },
      { key: "model", title: "Models", items: models },
    ];
  }, [data]);

  // ---------- Indexes for mention extraction ----------
  const apiIndex = useMemo(() => {
    const byKey = new Map<string, ApiRec>();
    const byId = new Map<string, ApiRec>();
    const byName = new Map<string, ApiRec>();
    const list: ApiRec[] = data?.data?.apis ?? [];
    for (const a of list) {
      if (a.key) byKey.set(a.key, a);
      if (a._id) byId.set(a._id, a);
      byName.set(a.name, a);
    }
    return { byKey, byId, byName };
  }, [data]);

  const functionIndex = useMemo(() => {
    const byName = new Map<string, FunctionRec>();
    const byId = new Map<string, FunctionRec>();
    const list: FunctionRec[] = data?.data?.functions ?? [];
    for (const f of list) {
      byName.set(f.name, f);
      byId.set(f._id, f);
    }
    return { byName, byId };
  }, [data]);

  const modelIndex = useMemo(() => {
    const byCollection = new Map<string, ModelRec>();
    const byName = new Map<string, ModelRec>();
    const list: ModelRec[] = data?.data?.models ?? [];
    for (const m of list) {
      if (m.collectionName) byCollection.set(m.collectionName, m);
      byName.set(m.name, m);
    }
    return { byCollection, byName };
  }, [data]);

  // ---------- Mention extraction ----------
  const prevMentionsRef = useRef<string>("[]");
  const norm = (s?: string) => (s ?? "").trim();

  const extractMentions = (text: string): Mention[] => {
    const out: Mention[] = [];
    const seen = new Set<string>();

    // functions: @Name
    const fnTokens = text.match(/@([A-Za-z0-9_]+)/g) || [];
    for (const tok of fnTokens) {
      const name = tok.slice(1);
      const f = functionIndex.byName.get(name);
      if (f) {
        const id = f._id;
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ mention_type: "functions", id, name: f.name, data: f });
        }
      }
    }

    // models: #collectionName (fallback #Name)
    const modelTokens = text.match(/#([A-Za-z0-9_]+)/g) || [];
    for (const tok of modelTokens) {
      const key = tok.slice(1);
      const rec = modelIndex.byCollection.get(key) ?? modelIndex.byName.get(key);
      if (rec) {
        const id = rec.collectionName ?? rec.name;
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ mention_type: "models", id, name: id, data: rec });
        }
      }
    }

    // APIs: new [[api:inner]] and legacy /api(inner)
    const apiNew = text.match(/\[\[api:([^\]]+)\]\]/g) || [];
    for (const tok of apiNew) {
      const inner = tok.slice(6, -2); // remove '[[api:' + ']]'
      const a =
        apiIndex.byKey.get(inner) ?? apiIndex.byId.get(inner) ?? apiIndex.byName.get(inner);
      if (a) {
        const id = a._id ?? a.key ?? a.name;
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ mention_type: "apis", id, name: a.name, data: a });
        }
      }
    }
    const apiLegacy = text.match(/\/api\(([^)]+)\)/g) || [];
    for (const tok of apiLegacy) {
      const inner = norm(tok.slice(5, -1));
      const a =
        apiIndex.byKey.get(inner) ?? apiIndex.byId.get(inner) ?? apiIndex.byName.get(inner);
      if (a) {
        const id = a._id ?? a.key ?? a.name;
        if (!seen.has(id)) {
          seen.add(id);
          out.push({ mention_type: "apis", id, name: a.name, data: a });
        }
      }
    }

    return out;
  };

  const maybeEmitMentions = (text: string) => {
    if (!onMentionsChange) return;
    const mentions = extractMentions(text);
    const nextStr = JSON.stringify(mentions.sort((a, b) => a.id.localeCompare(b.id)));
    if (nextStr !== prevMentionsRef.current) {
      prevMentionsRef.current = nextStr;
      onMentionsChange(mentions);
    }
  };

  // ---------- Filtering for @ palette ----------
  const getGroups = (q: string): Group[] => {
    const query = (q ?? "").toLowerCase().trim();
    const match = (i: Item) =>
      !query ||
      i.name.toLowerCase().includes(query) ||
      (i.description ?? "").toLowerCase().includes(query) ||
      (i.collectionName ?? "").toLowerCase().includes(query);
    return groups.map((g) => ({ ...g, items: g.items.filter(match) }));
  };

  /* >>> Build slash field groups: INPUT + OUTPUT + MODELS <<< */
  const slashGroups: SlashGroup[] = useMemo(() => {
    const metaModels = data?.data?.models ?? [];
    const modelSpecs = modelsFromMeta(metaModels);

    // models → groups
    const modelGroups: SlashGroup[] = modelSpecs.map((m) => ({
      key: `slash-model-${m.name}`,
      title: `Model: ${m.name}`,
      items: (m.fields ?? []).map<SlashItem>((f) => ({
        name: f,
        description: m.collectionName ? `(${m.collectionName})` : undefined,
        kind: "field",
        meta: { source: "model", modelName: m.name, path: f },
      })),
    }));

    // input → single group (if provided)
    const inputGroup: SlashGroup[] = inputSampleData
      ? [
          {
            key: "slash-input",
            title: "Input fields",
            items: extractJsonPaths(inputSampleData).map<SlashItem>(({ path, valueType }) => ({
              name: path,
              description: `Type: ${valueType}`,
              kind: "field",
              meta: { source: "input", modelName: "input", path },
            })),
          },
        ]
      : [];

    // output → single group (if provided)
    const outputGroup: SlashGroup[] = outputSampleData
      ? [
          {
            key: "slash-output",
            title: "Output fields",
            items: extractJsonPaths(outputSampleData).map<SlashItem>(({ path, valueType }) => ({
              name: path,
              description: `Type: ${valueType}`,
              kind: "field",
              meta: { source: "output", modelName: "output", path },
            })),
          },
        ]
      : [];

    return [...inputGroup, ...outputGroup, ...modelGroups];
  }, [data, JSON.stringify(inputSampleData ?? null), JSON.stringify(outputSampleData ?? null)]);

  // filter for slash palette — explicitly return SlashGroup[]
  const getSlashGroups = (q: string): SlashGroup[] => {
    const query = (q ?? "").toLowerCase().trim();
    if (!query) return slashGroups;
    return slashGroups.map<SlashGroup>((g) => ({
      ...g,
      items: g.items.filter(
        (i: SlashItem) =>
          i.name.toLowerCase().includes(query) ||
          (i.description ?? "").toLowerCase().includes(query)
      ),
    }));
  };

  // custom insertion that supports input/output/model tokens
  const insertFieldToken = ({
    editor,
    range,
    item,
  }: {
    editor: any;
    range: { from: number; to: number };
    item: SlashItem;
  }) => {
    const src = item?.meta?.source as "input" | "output" | "model" | undefined;
    const modelName = item?.meta?.modelName as string | undefined;
    const path = item?.meta?.path ?? item?.name;

    let token = "";
    if (src === "input") token = `{{input.${path}}}`;
    else if (src === "output") token = `{{output.${path}}}`;
    else if (src === "model") token = `{{model.${modelName}.${path}}}`;
    else token = `{{${path}}}`;

    editor.chain().focus().deleteRange(range).insertContent(token + " ").run();
  };

  // ---------- Editor ----------
  const lastExternal = useRef<string>(mappingInstructions ?? "");
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({}),
        HardBreak.configure({ keepMarks: false }),
        AtMenu({
          char: "@",
          getGroups,
          loading: () => !!isLoading,
          onInsert: ({ editor, range, item }) => {
            let text = item.name;
            if (item.kind === "api") {
              const inner = item.key ?? item.id ?? item.name;
              text = `[[api:${inner}]]`;
            } else if (item.kind === "function") {
              text = `@${item.name}`;
            } else if (item.kind === "model") {
              const token = item.collectionName ?? item.name;
              text = `#${token}`;
            }
            editor.chain().focus().deleteRange(range).insertContent(text + " ").run();

            const now = editor.state.doc.textBetween(
              0,
              editor.state.doc.content.size,
              "\n",
              "\n"
            );
            maybeEmitMentions(now);
          },
        }),

        // "/" fields menu (input + output + models)
        SlashFields({
          char: "/",
          getGroups: getSlashGroups,
          loading: () => !!isLoading,
          onInsert: ({ editor, range, item }) => insertFieldToken({ editor, range, item }),
        }),

        MentionHighlight,
      ],
      content: textToHtml(mappingInstructions),
      editorProps: {
        attributes: {
          class:
            "prose prose-invert max-w-none min-h-[420px] w-full rounded border bg-background p-4 outline-none",
        },
        handleKeyDown(view, event) {
          if (event.key === "Enter" && event.shiftKey) {
            (view as any).dispatch(
              (view.state as any).tr.replaceSelectionWith(
                (view.state.schema as any).nodes.hardBreak.create()
              )
            );
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        const text = editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size,
          "\n",
          "\n"
        );
        if (text !== lastExternal.current) {
          lastExternal.current = text;
          setMappingInstructions(text);
          maybeEmitMentions(text);
        }
      },
    },
    [
      JSON.stringify(groups.map((g) => g.items.length)),
      JSON.stringify(slashGroups.map((g: SlashGroup) => g.items.length)),
      isLoading,
    ]
  );

  // reflect external changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.state.doc.textBetween(
      0,
      editor.state.doc.content.size,
      "\n",
      "\n"
    );

    if (mappingInstructions !== current) {
      lastExternal.current = mappingInstructions ?? "";
      editor.commands.setContent(textToHtml(mappingInstructions), false);
      maybeEmitMentions(mappingInstructions ?? "");
    }
  }, [mappingInstructions, editor]);

  // Show “selected mentions” chips (optional UX)
  const selectedMentions = useMemo(
    () => extractMentions(mappingInstructions || ""),
    [mappingInstructions]
  );

  return (
    <div className="flex flex-col gap-2">
      <EditorContent editor={editor} />
      {selectedMentions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {selectedMentions.map((m) => {
            const label =
              m.mention_type === "apis"
                ? `API: ${m.name}`
                : m.mention_type === "functions"
                ? `Fn: ${m.name}`
                : `Model: ${m.name}`;
            return (
              <Badge
                key={`${m.mention_type}-${m.id}`}
                variant="secondary"
                className={
                  m.mention_type === "apis"
                    ? "border border-primary/30"
                    : m.mention_type === "functions"
                    ? "border border-blue-400/30"
                    : "border border-emerald-400/30"
                }
              >
                {label}
              </Badge>
            );
          })}
        </div>
      )}

      <style jsx>{`
        :global(.mention-chip) {
          border-radius: 0.375rem;
          padding: 0.05rem 0.35rem;
          margin: 0 0.05rem;
          font-weight: 600;
          white-space: nowrap;
        }
        /* API (indigo) */
        :global(.mention-api) {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
        /* Function (blue) */
        :global(.mention-func) {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.35);
        }
        /* Model tag #Model (emerald) */
        :global(.mention-model) {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        /* Field tokens — distinct colors for each source */
        :global(.mention-field-model) {
          background: rgba(16, 185, 129, 0.12);   /* emerald */
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        :global(.mention-field-input) {
          background: rgba(245, 158, 11, 0.12);   /* amber */
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        :global(.mention-field-output) {
          background: rgba(99, 102, 241, 0.12);   /* indigo */
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
      `}</style>
    </div>
  );
}