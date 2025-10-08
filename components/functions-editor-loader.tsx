import { Skeleton } from "@/components/ui/skeleton"

export function FunctionEditorSkeleton() {
  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-[400px] w-full" />
          </div>

          {/* Middle Column */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-[400px] w-full" />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}