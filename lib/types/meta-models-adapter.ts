// editors/meta-models-adapter.ts

export type JsonSchemaObject = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  [k: string]: any;
};

export type JsonSchema = JsonSchemaObject | true | false;

export type MetaModel = {
  name: string;
  collectionName?: string;
  type?: "collection" | "view" | string;
  isView?: boolean;
  estimatedCount?: number;
  schemaKind?: string;
  schema?: JsonSchema;
};

export type ModelSpec = {
  name: string;
  collectionName?: string;
  type?: string;
  estimatedCount?: number;
  schemaKind?: string;
  fields: string[]; // derived from schema
};

function typeSet(t?: string | string[]): Set<string> {
  if (!t) return new Set();
  if (Array.isArray(t)) return new Set(t);
  return new Set([t]);
}

type ExtractOpts = {
  includeArrayNode?: boolean;
  includeArrayIndex?: boolean;
  includeLeaves?: boolean;
};

const DEFAULT_OPTS: Required<ExtractOpts> = {
  includeArrayNode: true,
  includeArrayIndex: true,
  includeLeaves: true,
};

// Type guard: ensure we only treat non-boolean schemas as objects
function isSchemaObject(s: JsonSchema): s is JsonSchemaObject {
  return s !== true && s !== false;
}

/** Collect dot-notated field paths from a JSON Schema (best-effort). */
export function fieldsFromJsonSchema(
  schema: JsonSchema | undefined,
  base = "",
  opts: ExtractOpts = DEFAULT_OPTS,
): string[] {
  const o = { ...DEFAULT_OPTS, ...opts };
  const out: string[] = [];

  // Explicitly handle undefined and boolean schemas
  if (schema === undefined) {
    // unknown shape: if a base path exists, include it as a terminal
    if (base) out.push(base);
    return out;
  }
  if (schema === true) {
    // "accept anything": include the base path if provided
    if (base) out.push(base);
    return out;
  }
  if (schema === false) {
    // "accept nothing": contributes no fields
    return out;
  }

  // From here, schema is guaranteed to be an object
  const obj = schema as JsonSchemaObject;

  // Merge combinators (union)
  for (const k of ["anyOf", "oneOf", "allOf"] as const) {
    const list = obj[k];
    if (Array.isArray(list) && list.length) {
      const merged = new Set<string>();
      for (const sub of list) {
        for (const p of fieldsFromJsonSchema(sub, base, o)) merged.add(p);
      }
      return Array.from(merged);
    }
  }

  const ts = typeSet(obj.type);

  // object (or implicit object via properties)
  const hasProps = typeof obj.properties === "object" && obj.properties !== null;
  if (ts.has("object") || hasProps) {
    const props = obj.properties ?? {};
    const keys = Object.keys(props);
    if (!keys.length) {
      if (base) out.push(base); // empty object: treat as terminal
      return out;
    }
    for (const key of keys) {
      const next = base ? `${base}.${key}` : key;
      out.push(...fieldsFromJsonSchema(props[key], next, o));
    }
    return out;
  }

  // array
  if (ts.has("array")) {
    if (o.includeArrayNode && base) out.push(base);
    const items = obj.items;
    if (!items) return out;
    const itemSchema = Array.isArray(items) ? items[0] : items;
    const idxBase = o.includeArrayIndex && base ? `${base}[0]` : base;
    out.push(...fieldsFromJsonSchema(itemSchema, idxBase, o));
    return out;
  }

  // primitive leaf (string/number/integer/boolean/null/custom types like objectId)
  if (o.includeLeaves && base) out.push(base);
  return out;
}

/** Convert meta.models[] → ModelSpec[] (fields derived from schema). */
export function modelsFromMeta(metaModels: MetaModel[] | undefined): ModelSpec[] {
  if (!Array.isArray(metaModels)) return [];
  return metaModels.map((m) => {
    const fields = fieldsFromJsonSchema(m.schema, "", {
      includeArrayNode: true,
      includeArrayIndex: true,
      includeLeaves: true,
    });
    return {
      name: m.name,
      collectionName: m.collectionName,
      type: m.type,
      estimatedCount: m.estimatedCount,
      schemaKind: m.schemaKind,
      fields,
    };
  });
}