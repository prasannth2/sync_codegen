"use client";

import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { fetcher } from "@/lib/utils";
import { toast } from "sonner";
import { Dynamic } from "@/lib/types/mapper";
import { handleErrorWithToast } from "@/components/ui/shared-toast";

interface UseFunctionOptions extends SWRConfiguration {
  enabled?: boolean;
  filters?: ("all" | "mine" | "shared" | "bookmarked")[];
  limit?: number;
}

export function useFunction(
  functionId: string | null | undefined,
  options: UseFunctionOptions = {},
) {
  const { enabled = true, ...swrOptions } = options;

  const {
    data: myFunction,
    error,
    isLoading,
    mutate,
  } = useSWR<Dynamic>(
    functionId && enabled ? `/api/functions/${functionId}` : null,
    fetcher,
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      onError: handleErrorWithToast,
      ...swrOptions,
    },
  );

  return {
    myFunction,
    isLoading,
    error,
    mutate,
  };
}

export function useFunctions(options: UseFunctionOptions = {}) {
  const { filters = ["all"], limit = 50, ...swrOptions } = options;

  // Build query string with filters
  const filtersParam = filters.join(",");
  const queryParams = new URLSearchParams({
    filters: filtersParam,
    limit: limit.toString(),
  });

  const {
    data: functions = [],
    error,
    isLoading,
    mutate,
  } = useSWR<Dynamic[]>(`/api/functions?${queryParams.toString()}`, fetcher, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    fallbackData: [],
    onError: handleErrorWithToast,
    ...swrOptions,
  });

  const deleteFunction = async (id: string) => {
    const res = await fetch(`/api/functions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast(`Failed to delete API: ${res.statusText}`);
    }
  };

  return {
    functions,
    isLoading,
    error,
    mutate,
    deleteFunction,
  };
}

// Utility hook to invalidate all functions caches
export function useInvalidateFunctions() {
  const { mutate } = useSWRConfig();

  return () => {
    // Invalidate all functions list endpoints (with or without query strings)
    // but not individual functions details (/api/functions/[id])
    mutate(
      (key) => {
        if (typeof key !== "string") return false;
        // Match /api/functions or /api/functions?... but not /api/functions/id
        return (
          key.startsWith("/api/functions") && !key.match(/\/api\/functions\/[^/?]+/)
        );
      },
      undefined,
      { revalidate: true },
    );
  };
}
