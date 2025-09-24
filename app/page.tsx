import { MapperSchemaGenerator } from "@/components/mapper-schema-generator"

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto">
        <MapperSchemaGenerator />
      </div>
    </main>
  )
}
