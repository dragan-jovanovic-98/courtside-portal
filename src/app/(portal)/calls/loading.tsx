export default function CallsLoading() {
  return (
    <div className="space-y-4">
      {/* Filters + search skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#eeeff1]" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-[#eeeff1] bg-white overflow-hidden">
        {/* Header */}
        <div className="flex h-10 items-center gap-4 border-b border-[#eeeff1] px-3">
          {[150, 80, 120, 100, 80, 80, 200].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-[#eeeff1]" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-9 items-center gap-4 border-b border-[#eeeff1] px-3 last:border-b-0"
          >
            <div className="h-3.5 w-[140px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-[70px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-[110px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-5 w-[90px] animate-pulse rounded-md bg-[#eeeff1]" />
            <div className="h-3.5 w-[70px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-5 w-[75px] animate-pulse rounded-full bg-[#eeeff1]" />
            <div className="h-3.5 flex-1 animate-pulse rounded bg-[#eeeff1]" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-[#eeeff1]" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
          <div className="h-4 w-12 animate-pulse rounded bg-[#eeeff1]" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-[#eeeff1]" />
        </div>
      </div>
    </div>
  );
}
