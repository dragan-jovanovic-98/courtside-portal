export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      {/* View toggle skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-9 w-16 animate-pulse rounded-lg bg-[#eeeff1] sm:h-8" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-[#eeeff1] sm:h-8" />
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-md border border-[#eeeff1] bg-white overflow-hidden">
        <div className="flex h-10 items-center gap-4 border-b border-[#eeeff1] px-4">
          {[120, 140, 100, 80, 80].map((w, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-[#eeeff1]"
              style={{ width: w }}
            />
          ))}
        </div>
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

      {/* Mobile card list skeleton */}
      <div className="md:hidden overflow-hidden rounded-xl border border-[#eeeff1] bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3.5 border-t border-[#eeeff1] first:border-t-0"
          >
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#eeeff1]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[#eeeff1]" />
                <div className="ml-auto h-4 w-14 animate-pulse rounded bg-[#eeeff1]" />
              </div>
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#eeeff1]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
