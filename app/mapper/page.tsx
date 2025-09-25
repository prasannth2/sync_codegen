// app/mapper/page.tsx
import { MapperSchemaGenerator } from "@/components/mapper-schema-generator";
import { Suspense } from "react";

export default function MapperPage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto">
        <Suspense fallback={<div>Loading Mapper...</div>}>
          <MapperSchemaGenerator />
        </Suspense>
      </div>
    </main>
  );
}
