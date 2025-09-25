"use client";

import { errorToString } from "@/lib/utils";
import { toast } from "sonner";
import JsonView from "./json-view";

export const notImplementedToast = () => {
  toast.warning(
    <div className="flex gap-2 flex-col">
      <span className="font-semibold">Not implemented yet 🤣</span>
      <span className="text-xs text-muted-foreground">
        (This feature is coming soon)
      </span>
    </div>,
  );
};

export const voiceDisabledToast = () => {
  toast.warning(
    <div className="flex gap-2 flex-col">
      <span className="font-semibold">
        Sorry this feature is restricted by admin.
      </span>
      <span className="text-xs text-muted-foreground">
        (Please contact admin to enable this feature.)
      </span>
    </div>,
    {
      position: "top-right",
      style: {
        backgroundColor: "#fff5f5",
        color: "#000000",
      },
    },
  );
};

export const handleErrorWithToast = (error: Error, id?: string) => {
  toast.error(`${error?.name || "Error"}`, {
    description: (
      <div className="my-4 max-h-[340px] overflow-y-auto">
        <JsonView data={errorToString(error)} />
      </div>
    ),
    id,
  });

  return error;
};
