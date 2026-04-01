import { Skeleton } from "@/components/ui/skeleton"

export function UserSkeleton() {
  return (
    <div className="space-y-6">
      {/* User Identity Skeleton */}
      <div className="flex items-start gap-4 sm:gap-6">
        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3 rounded-md border flex-1 min-w-[140px]">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>

      {/* Tab + Search row Skeleton */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-8 w-[168px]" />
        <Skeleton className="h-8 w-[200px] sm:ml-auto" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-md p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}
