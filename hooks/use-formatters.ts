"use client";

import useSWR, { SWRConfiguration, useSWRConfig } from "swr";
import { fetcher } from "@/lib/utils";
import { toast } from "sonner";
import { Dynamic } from "@/lib/types/mapper";
import { handleErrorWithToast } from "@/components/ui/shared-toast";

interface UseFormatterOptions extends SWRConfiguration {
  enabled?: boolean;
  filters?: ("all" | "mine" | "shared" | "bookmarked")[];
  limit?: number;
}

export function useFormatter(
  formatterId: string | null | undefined,
  options: UseFormatterOptions = {},
) {
  const { enabled = true, ...swrOptions } = options;

  const {
    data: formatter,
    error,
    isLoading,
    mutate,
  } = useSWR<Dynamic>(
    formatterId && enabled ? `/api/formatters/${formatterId}` : null,
    fetcher,
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      onError: handleErrorWithToast,
      ...swrOptions,
    },
  );

  return {
    formatter,
    isLoading,
    error,
    mutate,
  };
}

export function useFormatters(options: UseFormatterOptions = {}) {
  const { filters = ["all"], limit = 50, ...swrOptions } = options;

  // Build query string with filters
  const filtersParam = filters.join(",");
  const queryParams = new URLSearchParams({
    filters: filtersParam,
    limit: limit.toString(),
  });

  const {
    data: formatters = [],
    error,
    isLoading,
    mutate,
  } = useSWR<Dynamic[]>(`/api/formatters?${queryParams.toString()}`, fetcher, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    fallbackData: [],
    onError: handleErrorWithToast,
    ...swrOptions,
  });

  const deleteFormatter = async (id: string) => {
    const res = await fetch(`/api/formatters/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast(`Failed to delete API: ${res.statusText}`);
    }
  };

  return {
    formatters,
    isLoading,
    error,
    mutate,
    deleteFormatter,
  };
}

// Utility hook to invalidate all formatters caches
export function useInvalidateFormatters() {
  const { mutate } = useSWRConfig();

  return () => {
    // Invalidate all formatters list endpoints (with or without query strings)
    // but not individual formatters details (/api/formatters/[id])
    mutate(
      (key) => {
        if (typeof key !== "string") return false;
        // Match /api/formatters or /api/formatters?... but not /api/formatters/id
        return (
          key.startsWith("/api/formatters") && !key.match(/\/api\/formatters\/[^/?]+/)
        );
      },
      undefined,
      { revalidate: true },
    );
  };
}
