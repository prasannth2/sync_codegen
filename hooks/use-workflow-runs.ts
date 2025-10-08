// hooks/use-workflow-runs.ts
"use client";

import useSWR from "swr";
import type { WorkflowRunsResponse } from "@/components/workflow-logs/types";
import { API_BASE_URL } from "@/lib/utils/env";
import { joinUrl } from "@/lib/utils/url";
import { fetcher as commonFetcher } from "@/lib/utils";

export function useWorkflowRuns(
  { page, limit, q }: { page: number; limit: number; q?: string }
) {
  const url = joinUrl(
    API_BASE_URL,
    `/api/workflow-runs?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate, // use this for refresh (single path)
  } = useSWR<WorkflowRunsResponse, Error>(
    url,
    // use your common fetcher (typed)
    (key: string) => commonFetcher(key),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,    // prevents extra call on mount when key appears "stale"
      dedupingInterval: 1500,      // collapse near-simultaneous requests
      keepPreviousData: true,
    }
  );

  return {
    runs: data?.data.items ?? [],
    pageInfo: data?.data,
    isLoading,
    isRefreshing: isValidating,     // single flag now
    error,
    errorMessage: error?.message ?? null,
    errorStatus: (error as any)?.status as number | undefined,
    refresh: async () => {
      // one request, same fetcher, uses SWR cache/deduper
      await mutate();
    },
  };
}