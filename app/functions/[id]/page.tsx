"use client";

import { AddEditFunctions } from "@/components/add-edit-functions";
import { FunctionEditorSkeleton } from "@/components/functions-editor-loader";
import { useFunction } from "@/hooks/use-functions";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default function ApisPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  if (id === "new") {
    return (
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="mx-auto">
          <Suspense fallback={<div>Loading Functions...</div>}>
            <AddEditFunctions />
          </Suspense>
        </div>
      </main>
    );
  }

  const { myFunction, isLoading } = useFunction(id);

  if (!isLoading && !myFunction) {
    notFound();
  }

  if (isLoading) {
    return <FunctionEditorSkeleton />
  }

  return (
    <main className="min-h-screen bg-background py-2 px-4">
      <div className="mx-auto">
        <Suspense fallback={<FunctionEditorSkeleton />}>
          <AddEditFunctions initialFormatter={myFunction?.data} />
        </Suspense>
      </div>
    </main>
  );
}