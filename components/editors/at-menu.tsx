import React, { useEffect, useMemo, useRef, useState } from "react";

import { EditorContent, ReactRenderer } from "@tiptap/react";
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
import { Group, Item } from "@/lib/types/editor";


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
export const AtMenu = (opts: {
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
          pluginKey: new PluginKey("suggestion-at"),
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