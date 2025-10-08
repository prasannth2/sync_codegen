"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { FieldItem , flattenSchema, JsonSchema} from "@/lib/utils/editor";

function useModelFields(baseUrl: string | undefined, modelName: string | null) {
  const key = baseUrl && modelName ? `${baseUrl}/api/meta/models/${encodeURIComponent(modelName)}` : null;
  const { data, isLoading } = useSWR(key, async (url) => {
    const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!r.ok) throw new Error("Failed to load model schema");
    return r.json();
  });

  const fields: FieldItem[] = useMemo(() => {
    const props = data?.data?.schema?.properties as Record<string, JsonSchema> | undefined;
    return flattenSchema(props);
  }, [data]);

  return { fields, loading: isLoading };
}
