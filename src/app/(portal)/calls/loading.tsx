export default function CallsLoading() {
  return (
    <div className="space-y-4">
      {/* Filters + search skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 animate-pulse rounded-lg bg-[#eeeff1] sm:h-8 sm:w-24" />
          <div className="hidden sm:block h-8 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
          <div className="hidden sm:block h-8 w-24 animate-pulse rounded-lg bg-[#eeeff1]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-full max-w-[280px] animate-pulse rounded-lg bg-[#eeeff1] sm:h-8 sm:w-48" />
        </div>
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-lg border border-[#eeeff1] bg-white overflow-hidden">
        <div className="flex h-10 items-center gap-4 border-b border-[#eeeff1] px-3">
          {[150, 80, 120, 100, 80, 80, 200].map((w, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-[#eeeff1]"
              style={{ width: w }}
            />
          ))}
        </div>
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

      {/* Mobile card list skeleton */}
      <div className="md:hidden overflow-hidden rounded-xl border border-[#eeeff1] bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#eeeff1] first:border-t-0"
          >
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#eeeff1]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 animate-pulse rounded bg-[#eeeff1]" />
                <div className="ml-auto h-3 w-16 animate-pulse rounded bg-[#eeeff1]" />
              </div>
              <div className="h-3 w-3/4 animate-pulse rounded bg-[#eeeff1]" />
              <div className="flex gap-1.5 mt-0.5">
                <div className="h-4 w-12 animate-pulse rounded bg-[#eeeff1]" />
                <div className="h-4 w-16 animate-pulse rounded bg-[#eeeff1]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-[#eeeff1]" />
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-[#eeeff1] sm:h-9" />
          <div className="h-4 w-12 animate-pulse rounded bg-[#eeeff1]" />
          <div className="h-10 w-20 animate-pulse rounded-lg bg-[#eeeff1] sm:h-9" />
        </div>
      </div>
    </div>
  );
}
