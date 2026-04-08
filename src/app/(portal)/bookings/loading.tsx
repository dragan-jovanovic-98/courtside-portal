export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      {/* View toggle skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 animate-pulse rounded-lg bg-[#eeeff1]" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border border-[#eeeff1] bg-white overflow-hidden">
        {/* Header */}
        <div className="flex h-10 items-center gap-4 border-b border-[#eeeff1] px-4">
          {[120, 140, 100, 80, 80].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-[#eeeff1]" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex h-12 items-center gap-4 border-b border-[#eeeff1] px-4 last:border-b-0"
          >
            <div className="h-3.5 w-[110px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-[130px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-[90px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-[60px] animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-5 w-[70px] animate-pulse rounded-md bg-[#eeeff1]" />
          </div>
        ))}
      </div>
    </div>
  );
}
