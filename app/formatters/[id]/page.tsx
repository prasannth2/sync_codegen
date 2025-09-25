"use client";

import { AddEditFormatter } from "@/components/add-edit-fromatter";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { useFormatter } from "@/hooks/use-formatters";

export default function ApisPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

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
        <Suspense fallback={<div>Loading Mapper...</div>}>
          <AddEditFormatter initialFormatter={formatter?.data} />
        </Suspense>
      </div>
    </main>
  );
}