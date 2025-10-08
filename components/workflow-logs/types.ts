// components/workflow-logs/types.ts
export type WorkflowRun = {
  _id: string;
  workflow_id: string;
  status: "succeeded" | "failed" | "running" | "queued" | "info" | "error";
  error_name?: string | null;
  error_message?: string | null;
  error_stack?: string | null;
  error_node?: { node_id: string | null; node_type: string | null };
  started_at?: string | null;
  ended_at?: string | null;
  metrics?: {
    total_nodes?: number;
    succeeded_nodes?: number;
    failed_nodes?: number;
    items_processed?: number;
    duration_ms?: number;
    extra?: Record<string, unknown>;
  };
  context_snapshot?: Record<string, unknown>;
  nodes?: Array<{
    node_id: string;
    type: string;
    started_at?: string | null;
    ended_at?: string | null;
    status?: string;
    input_preview?: unknown;
    output_preview?: unknown;
    error_name?: string | null;
    error_message?: string | null;
    error_stack?: string | null;
    metrics?: Record<string, unknown>;
  }>;
  node_logs?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  // optional: trigger/cost your API may add later
  trigger?: "schedule" | "manual" | "api" | string;
  cost_usd?: number;
};

export type WorkflowRunsResponse = {
  status: number;
  data: {
    items: WorkflowRun[];
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
    next_cursor?: string;
  };
};