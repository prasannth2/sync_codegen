"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import HardBreak from "@tiptap/extension-hard-break";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// shadcn/ui
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { textToHtml } from "@/lib/utils/editor";

/* ---------- Types ---------- */
type ApiRec = { _id?: string; name: string; key?: string };
type FunctionRec = { _id: string; api_id?: string; name: string; key?: string };
type ModelRec = {
  name: string;
  collectionName?: string;
  type?: string;
  isView?: boolean;
  estimatedCount?: number;
  schemaKind?: string;
};

type MentionApi = {
  mention_type: "apis";
  id: string;
  name: string;
  data: ApiRec;
};
type MentionFunction = {
  mention_type: "functions";
  id: string; // function _id
  name: string; // function name
  data: FunctionRec;
};
type MentionModel = {
  mention_type: "models";
  id: string; // prefer collectionName, else name
  name: string; // collectionName|name
  data: ModelRec;
};

export type Mention = MentionApi | MentionFunction | MentionModel;

type GroupKey = "api" | "function" | "model";

type Item = {
  id?: string;
  key?: string;
  name: string;
  description?: string;
  kind: GroupKey;
  collectionName?: string; // for models
};

type Group = {
  key: GroupKey;
  title: string;
  items: Item[];
};

export type InstructionEditorProps = {
  mappingInstructions: string;
  setMappingInstructions: (val: string) => void;
  availableVariables?: { name: string; description?: string }[]; // kept for compat
  namingStyle?: string; // kept for compat
  onMentionsChange?: (mentions: Mention[]) => void; // optional
};

/* ---------- Data fetch ---------- */
const fetcher = async (url: string) => {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
};

/* ---------- shadcn Command popup ---------- */
function SuggestionList({
  groups,
  command,
  onClose,
  clientRect,
  loading,
}: {
  groups: Group[];
  command: (i: Item) => void;
  onClose: () => void;
  clientRect: () => DOMRect | null;
  loading?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  const reposition = () => {
    const rect = clientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.min(420, Math.max(280, rect.width)),
      });
    }
  };

  useEffect(() => {
    reposition();
  }, []);
  useEffect(() => {
    const h = () => reposition();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-md border bg-popover text-popover-foreground shadow-md"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      onMouseDown={(e) => e.preventDefault()} // keep focus in editor
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Filter…" />
        <CommandList className="max-h-72">
          <CommandEmpty>{loading ? "Loading…" : "No results"}</CommandEmpty>

          {groups
            .filter((g) => g.items.length)
            .map((g, gi) => (
              <CommandGroup key={g.key} heading={g.title}>
                {g.items.map((it, i) => (
                  <CommandItem
                    key={`${g.key}-${it.name}-${i}`}
                    onSelect={() => {
                      command(it);
                      onClose();
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="font-medium">{it.name}</span>
                    {it.description ? (
                      <span className="text-xs text-muted-foreground">{it.description}</span>
                    ) : null}
                  </CommandItem>
                ))}
                {gi < groups.length - 1 ? <Separator className="my-1" /> : null}
              </CommandGroup>
            ))}
        </CommandList>
      </Command>
    </div>
  );
}

/* ---------- TipTap extension: @ menu ---------- */
const AtMenu = (opts: {
  char?: string;
  getGroups: (query: string) => Group[];
  loading?: () => boolean;
  onInsert: (payload: { editor: any; range: { from: number; to: number }; item: Item }) => void;
}) =>
  Extension.create({
    name: "at-menu",
    addProseMirrorPlugins() {
      let rr: ReactRenderer | null = null;

      return [
        Suggestion<Item>({
          editor: this.editor,
          char: opts.char ?? "@",
          allowSpaces: true,
          allowToIncludeChar: true,
          items: ({ query }) => opts.getGroups(query).flatMap((g) => g.items),
          command: ({ editor, range, props }) => opts.onInsert({ editor, range, item: props }),
          render: () => ({
            onStart: (props) => {
              rr = new ReactRenderer(SuggestionList, {
                props: {
                  groups: opts.getGroups(props.query),
                  command: props.command,
                  onClose: () => props.editor.commands.focus(),
                  clientRect: props.clientRect as any,
                  loading: opts.loading?.(),
                },
                editor: props.editor,
              });
              document.body.appendChild(rr.element);
            },
            onUpdate: (props) => {
              rr?.updateProps({
                groups: opts.getGroups(props.query),
                command: props.command,
                onClose: () => props.editor.commands.focus(),
                clientRect: props.clientRect as any,
                loading: opts.loading?.(),
              });
            },
            onKeyDown: ({ event }) => (event.key === "Escape" ? true : false),
            onExit: () => {
              rr?.destroy();
              rr = null;
            },
          }),
        }),
      ];
    },
  });

/* ---------- TipTap extension: inline highlighting (decorations) ---------- */
/**
 * This keeps your document as plain text but visually styles tokens:
 * - @functionName
 * - #collectionName or #ModelName
 * - /api(someKey|_id|Name)
 */
const MentionHighlight = Extension.create({
  name: "mention-highlight",

  addProseMirrorPlugins() {
    const key = new PluginKey("mention-highlight");

    const buildDecos = (doc: any) => {
      const decorations: Decoration[] = [];
      const rx = /\/api\(([^)]+)\)|#[A-Za-z0-9_]+|@[A-Za-z0-9_]+/g;

      doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;
        const text: string = node.text ?? "";
        let m: RegExpExecArray | null;
        while ((m = rx.exec(text))) {
          const start = pos + m.index;
          const end = start + m[0].length;
          const val = m[0];

          let cls = "mention-chip";
          if (val.startsWith("/api(")) cls += " mention-api";
          else if (val.startsWith("#")) cls += " mention-model";
          else if (val.startsWith("@")) cls += " mention-func";

          decorations.push(Decoration.inline(start, end, { class: cls }));
        }
      });

      return DecorationSet.create(doc, decorations);
    };

    // ✅ Return an array of plugins
    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => buildDecos(doc),
          apply: (tr, old) => {
            if (tr.docChanged) return buildDecos(tr.doc);
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

/* ---------- Main controlled component ---------- */
export default function InstructionEditor({
  mappingInstructions,
  setMappingInstructions,
  onMentionsChange,
}: InstructionEditorProps) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const { data, isLoading } = useSWR(base ? `${base}/api/meta?includeCounts=true` : null, fetcher);

  // Build groups from API
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
      // If/when you’re ready to expose functions in the palette, just uncomment:
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

    // apis: /api(inner)
    const apiTokens = text.match(/\/api\(([^)]+)\)/g) || [];
    for (const tok of apiTokens) {
      const inner = norm(tok.slice(5, -1));
      const a =
        apiIndex.byKey.get(inner) ??
        apiIndex.byId.get(inner) ??
        apiIndex.byName.get(inner);
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

  // ---------- Filtering for palette ----------
  const getGroups = (q: string): Group[] => {
    const query = (q ?? "").toLowerCase().trim();
    const match = (i: Item) =>
      !query ||
      i.name.toLowerCase().includes(query) ||
      (i.description ?? "").toLowerCase().includes(query) ||
      (i.collectionName ?? "").toLowerCase().includes(query);
    return groups.map((g) => ({ ...g, items: g.items.filter(match) }));
  };

  // ---------- Editor ----------
  const lastExternal = useRef<string>(mappingInstructions ?? "");
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Keep paragraphs & lists; we'll add HardBreak for Shift+Enter newlines
        }),
        HardBreak.configure({
          keepMarks: false,
        }),
        AtMenu({
          char: "@",
          getGroups,
          loading: () => !!isLoading,
          onInsert: ({ editor, range, item }) => {
            let text = item.name;
            if (item.kind === "api") {
              text = `/api(${item.key ?? item.id ?? item.name})`;
            } else if (item.kind === "function") {
              text = `@${item.name}`;
            } else if (item.kind === "model") {
              const token = item.collectionName ?? item.name;
              text = `#${token}`;
            }
            editor.chain().focus().deleteRange(range).insertContent(text + " ").run();

            // emit mentions immediately after an insertion
            const now = editor.state.doc.textBetween(
              0,
              editor.state.doc.content.size,
              "\n", // block separator
              "\n"  // leafText (hardBreak) separator
            );
            maybeEmitMentions(now);
          },
        }),
        MentionHighlight, // purely visual; keeps underlying text untouched
      ],
      content: textToHtml(mappingInstructions),
      editorProps: {
        attributes: {
          class:
            // Keep your look; add chip styling via utility classes
            "prose prose-invert max-w-none min-h-[420px] w-full rounded border bg-background p-4 outline-none",
        },
        handleKeyDown(view, event) {
          // Chat-like new line behavior: Shift+Enter => soft break, Enter => paragraph (default)
          if (event.key === "Enter" && event.shiftKey) {
            (view as any).dispatch((view.state as any).tr.replaceSelectionWith((view.state.schema as any).nodes.hardBreak.create()));
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        // Keep both block breaks and hard breaks as "\n"
        const text = editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size,
          "\n", // block separator
          "\n"  // leafText (hardBreak) separator
        );
        if (text !== lastExternal.current) {
          lastExternal.current = text;
          setMappingInstructions(text);
          maybeEmitMentions(text);
        }
      },
    },
    // Re-init when palette changes (sizes) so results stay fresh
    [JSON.stringify(groups.map((g) => g.items.length)), isLoading]
  );

  // reflect external changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.state.doc.textBetween(
      0,
      editor.state.doc.content.size,
      "\n", // block separator
      "\n"  // leafText (hardBreak) separator
    );

    if (mappingInstructions !== current) {
      lastExternal.current = mappingInstructions ?? "";
      editor.commands.setContent(textToHtml(mappingInstructions), false);
      maybeEmitMentions(mappingInstructions ?? "");
    }
  }, [mappingInstructions, editor]);

  // Show “selected mentions” chips (optional UX)
  const selectedMentions = useMemo(() => extractMentions(mappingInstructions || ""), [
    mappingInstructions,
  ]);

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

      {/* Inline styles for the chips inside the editor (decoration classes). 
          Tailwind can't reach ProseMirror decorations reliably, so we add a tiny CSS bridge. */}
      <style jsx>{`
        :global(.mention-chip) {
          border-radius: 0.375rem;
          padding: 0.05rem 0.35rem;
          margin: 0 0.05rem;
          font-weight: 600;
          white-space: nowrap;
        }
        :global(.mention-api) {
          background: rgba(99, 102, 241, 0.12); /* indigo-500/12 */
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
        :global(.mention-func) {
          background: rgba(59, 130, 246, 0.12); /* blue-500/12 */
          border: 1px solid rgba(59, 130, 246, 0.35);
        }
        :global(.mention-model) {
          background: rgba(16, 185, 129, 0.12); /* emerald-500/12 */
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
      `}</style>
    </div>
  );
}