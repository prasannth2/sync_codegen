// editors/slash-fields.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "prosemirror-state";

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
import { SlashGroup, SlashItem } from "@/lib/types/editor";

/* -------------------- UI popup (same style as your @ menu) -------------------- */
function SuggestionList({
    groups,
    command,
    onClose,
    clientRect,
    loading,
}: {
    groups: SlashGroup[];
    command: (i: SlashItem) => void;
    onClose: () => void;
    clientRect: () => DOMRect | null;
    loading?: boolean;
}) {
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
        const h = () => reposition();
        window.addEventListener("scroll", h, true);
        window.addEventListener("resize", h);
        return () => {
            window.removeEventListener("scroll", h, true);
            window.removeEventListener("resize", h);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className="fixed z-50 rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            onMouseDown={(e) => e.preventDefault()}
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

/* --------------------------- TipTap extension --------------------------- */
export const SlashFields = (opts: {
    char?: string; // default "/"
    getGroups: (query: string) => SlashGroup[];
    loading?: () => boolean;
    onInsert: (payload: { editor: any; range: { from: number; to: number }; item: SlashItem }) => void;
}) =>
    Extension.create({
        name: "slash-fields",
        addProseMirrorPlugins() {
            let rr: ReactRenderer | null = null;

            return [
                Suggestion<SlashItem>({
                    pluginKey: new PluginKey("suggestion-slash-fields"),
                    editor: this.editor,
                    char: opts.char ?? "/",
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

/* ------------------- Token insertion helper ({{model.X.path}}) ------------------- */
export function defaultInsertFieldToken({
    editor,
    range,
    item,
}: {
    editor: any;
    range: { from: number; to: number };
    item: SlashItem;
}) {
    const modelName = item.meta.modelName;
    const path = item.meta.path;
    const token = `{{model.${modelName}.${path}}}`;
    editor.chain().focus().deleteRange(range).insertContent(token + " ").run();
}

/* ---------------- Builder to turn ModelSpec[] into Slash groups ---------------- */
export function buildSlashGroupsFromModels(models: { name: string; collectionName?: string; fields: string[] }[]) {
    return models.map((m) => ({
        key: `slash-model-${m.name}`,
        title: `Model: ${m.name}`,
        items: (m.fields ?? []).map((f) => ({
            name: f,
            description: m.collectionName ? `(${m.collectionName})` : undefined,
            kind: "field" as const,
            meta: { source: "model" as const, modelName: m.name, path: f },
        })),
    }));
}
