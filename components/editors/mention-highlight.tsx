import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * Styles tokens inline as chips:
 * - API:   /api(key)  OR [[api:key]]
 * - Model: #Model or #collection
 * - Func:  @Function
 * - Field tokens:
 *      {{model.X.y}}   → .mention-field-model
 *      {{input.x.y}}   → .mention-field-input
 *      {{output.x.y}}  → .mention-field-output
 */
export const MentionHighlight = Extension.create({
  name: "mention-highlight",

  addProseMirrorPlugins() {
    const key = new PluginKey("mention-highlight");

    // One regex to *find* tokens (classification done by prefix checks)
    //  - /api(...)                    legacy API
    //  - [[api:...]]                 new API
    //  - #Model(.subparts)?          model tag
    //  - @Function                   function tag
    //  - {{(model|input|output).…}}  field tokens
    const RX =
      /\/api\([^)]+\)|\[\[api:[^\]]+\]\]|#[A-Za-z0-9_]+(?:\.[A-Za-z0-9_.]+)?|@[A-Za-z0-9_]+|{{\s*(?:model|input|output)\.[^}]+}}/g;

    const buildDecos = (doc: any) => {
      const decorations: Decoration[] = [];

      doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;
        const text: string = node.text ?? "";
        let m: RegExpExecArray | null;

        while ((m = RX.exec(text))) {
          const raw = m[0];
          const start = pos + m.index;
          const end = start + raw.length;

          let cls = "mention-chip";

          if (raw.startsWith("/api(") || raw.startsWith("[[api:")) {
            cls += " mention-api";
          } else if (raw.startsWith("#")) {
            cls += " mention-model";
          } else if (raw.startsWith("@")) {
            cls += " mention-func";
          } else if (raw.startsWith("{{")) {
            // Normalize inside {{ ... }}
            const inner = raw.slice(2, -2).trim(); // strip {{ }}
            if (inner.startsWith("model.")) {
              cls += " mention-field-model";
            } else if (inner.startsWith("input.")) {
              cls += " mention-field-input";
            } else if (inner.startsWith("output.")) {
              cls += " mention-field-output";
            } else {
              // fallback if someone types {{something else}}
              cls += " mention-field";
            }
          }

          decorations.push(Decoration.inline(start, end, { class: cls }));
        }
      });

      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => buildDecos(doc),
          apply: (tr, old) => (tr.docChanged ? buildDecos(tr.doc) : old.map(tr.mapping, tr.doc)),
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