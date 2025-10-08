// components/workflow-logs/error-banner.tsx
"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
      <AlertCircle className="h-4 w-4 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-medium">Failed to load logs</div>
        <div className="text-muted-foreground">{message}</div>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} className="text-destructive border-destructive/30">
        <RefreshCcw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}