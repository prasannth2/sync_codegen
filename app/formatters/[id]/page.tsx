"use client";

import { AddEditFormatter } from "@/components/add-edit-fromatter";
import { useFormatter } from "@/hooks/use-formatters";
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
          <Suspense fallback={<div>Loading Formatter...</div>}>
            <AddEditFormatter />
          </Suspense>
        </div>
      </main>
    );
  }

  const { formatter, isLoading } = useFormatter(id);

  if (!isLoading && !formatter) {
    notFound();
  }

  if (isLoading) {
    return <div>Loading</div>
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto">
        <Suspense fallback={<div>Loading Formatter...</div>}>
          <AddEditFormatter initialFormatter={formatter?.data} />
        </Suspense>
      </div>
    </main>
  );
}