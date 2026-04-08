export default function BillingLoading() {
  return (
    <div className="space-y-6">
      {/* Plan + Usage row skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Plan card */}
        <div className="rounded-lg border border-[#eeeff1] bg-white">
          <div className="px-5 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="h-7 w-24 animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-[#eeeff1]" />
            </div>
            <div className="h-4 w-64 animate-pulse rounded bg-[#eeeff1]" />
            <div className="h-3.5 w-36 animate-pulse rounded bg-[#eeeff1]" />
            <div className="flex items-center gap-2 pt-1">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-[#eeeff1]" />
              <div className="h-9 w-36 animate-pulse rounded-lg bg-[#eeeff1]" />
            </div>
          </div>
        </div>

        {/* Usage meter */}
        <div className="rounded-lg border border-[#eeeff1] bg-white">
          <div className="px-5 py-4">
            <div className="h-3 w-28 animate-pulse rounded bg-[#eeeff1]" />
          </div>
          <div className="px-5 pb-5 space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="h-4 w-20 animate-pulse rounded bg-[#eeeff1]" />
                <div className="h-5 w-24 animate-pulse rounded bg-[#eeeff1]" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-[#eeeff1]" />
              <div className="mt-1.5 h-3 w-28 animate-pulse rounded bg-[#eeeff1]" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-[#eeeff1]" />
                <div className="h-5 w-12 animate-pulse rounded bg-[#eeeff1]" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-[#eeeff1]" />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice history skeleton */}
      <div className="rounded-lg border border-[#eeeff1] bg-white overflow-hidden">
        <div className="px-5 py-4">
          <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
        </div>
        <div className="border-t border-[#eeeff1]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex h-10 items-center gap-4 border-b border-[#eeeff1] px-3 last:border-b-0"
            >
              <div className="h-3.5 w-[100px] animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-3.5 w-[70px] animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-5 w-[60px] animate-pulse rounded-full bg-[#eeeff1]" />
              <div className="h-3.5 w-[40px] animate-pulse rounded bg-[#eeeff1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
