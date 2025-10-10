"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type AutoGrowTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
  maxRows?: number;
};

export const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ className, onChange, minRows = 6, maxRows, style, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    // keep external ref in sync
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;

      // reset to shrink if needed, then grow to content
      el.style.height = "auto";

      // compute height with optional row clamps
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
      const minH = minRows ? minRows * lineHeight : 0;
      const maxH = maxRows ? maxRows * lineHeight : Infinity;

      const next = Math.min(Math.max(el.scrollHeight, minH), maxH);
      el.style.height = `${next}px`;
    }, [minRows, maxRows]);

    // resize on mount & whenever value changes
    React.useLayoutEffect(() => {
      resize();
    }, [props.value, resize]);

    return (
      <textarea
        {...props}
        ref={innerRef}
        onChange={(e) => {
          onChange?.(e);
          // resize in the same tick for smoothness
          resize();
        }}
        // prevent inner scrollbars—page will scroll instead
        className={cn(
          "block w-full resize-none overflow-hidden focus-visible:outline-none",
          // keep your base textarea look (tailwind/shadcn compatible)
          "rounded-md border bg-background px-3 py-2 text-sm",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{ ...style, height: "auto" }}
        rows={minRows}
      />
    );
  }
);
AutoGrowTextarea.displayName = "AutoGrowTextarea";
