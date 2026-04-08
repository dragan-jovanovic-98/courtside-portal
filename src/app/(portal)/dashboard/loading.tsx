export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-6 w-56 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-2 h-4 w-28 animate-pulse rounded bg-[#eeeff1]" />
        </div>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#eeeff1]" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#eeeff1] bg-[#eeeff1] lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col justify-between bg-white px-5 py-5">
            <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
            <div className="mt-4 h-7 w-16 animate-pulse rounded bg-[#eeeff1]" />
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
          </div>
        ))}
      </div>

      {/* Charts row 1 skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-[#eeeff1] bg-white p-5">
          <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-6 h-[220px] animate-pulse rounded bg-[#eeeff1]" />
        </div>
        <div className="rounded-lg border border-[#eeeff1] bg-white p-5">
          <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-6 flex items-center justify-center">
            <div className="h-[156px] w-[156px] animate-pulse rounded-full bg-[#eeeff1]" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
          </div>
        </div>
      </div>

      {/* Charts row 2 skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[#eeeff1] bg-white p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
            <div className="mt-6 h-[220px] animate-pulse rounded bg-[#eeeff1]" />
          </div>
        ))}
      </div>
    </div>
  );
}
