export default function SettingsLoading() {
  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        <div>
          <div className="h-4 w-36 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-2.5 h-3.5 w-72 animate-pulse rounded bg-[#eeeff1]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-[#eeeff1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
