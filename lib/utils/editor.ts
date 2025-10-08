export function textToHtml(src: string) {
  const safe = (src ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]!));
  // CRLF → LF
  const norm = safe.replace(/\r\n/g, "\n");
  // Split paragraphs on blank line(s)
  const paras = norm.split(/\n{2,}/).map(p =>
    `<p>${p.replace(/\n/g, "<br />")}</p>`
  );
  return paras.join("");
}

export type JsonSchema =
  | { type: "object"; properties?: Record<string, JsonSchema> }
  | { type: "array"; items?: JsonSchema }
  | { type: string | string[]; properties?: Record<string, JsonSchema>; items?: JsonSchema };

export type FieldItem = { path: string; type: string };

export function flattenSchema(props: Record<string, JsonSchema> | undefined, base = ""): FieldItem[] {
  if (!props) return [];
  const out: FieldItem[] = [];

  for (const [key, node] of Object.entries(props)) {
    const path = base ? `${base}.${key}` : key;

    // resolve type text
    const t = Array.isArray((node as any).type) ? (node as any).type.join("|") : (node as any).type ?? "any";

    out.push({ path, type: t });

    // object recursion
    if ((node as any).type === "object" && (node as any).properties) {
      out.push(...flattenSchema((node as any).properties, path));
    }

    // array<object> recursion
    if ((node as any).type === "array" && (node as any).items && (node as any).items!.type === "object") {
      const items = (node as any).items as JsonSchema;
      out.push(...flattenSchema((items as any).properties, path + "[]"));
    }
  }

  return out;
}

export const posFrom = (state: any, range?: { from: number; to: number }) =>
  (range && typeof range.from === "number" ? range.from : state.selection.from);

const WORD_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
export const DOT_ALLOWED_PREFIXES = ["#", " " , ...WORD_CHARS.split("")];
