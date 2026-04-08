"use client";

import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subscription } from "@/lib/types";

export function UsageMeter({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Usage</p>
        </div>
        <div className="flex flex-col items-center justify-center pb-8 pt-2">
          <BarChart3 className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No usage data</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Subscribe to a plan to track your usage.</p>
        </div>
      </div>
    );
  }

  const { call_minutes_used, call_minutes_limit, phone_numbers_used, phone_numbers_limit } = subscription;
  const usagePercent = call_minutes_limit > 0 ? (call_minutes_used / call_minutes_limit) * 100 : 0;
  const remaining = Math.max(0, call_minutes_limit - call_minutes_used);
  const overage = Math.max(0, call_minutes_used - call_minutes_limit);
  const phonePercent = phone_numbers_limit > 0 ? (phone_numbers_used / phone_numbers_limit) * 100 : 0;

  const barColor =
    usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-[#242529]";

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Usage This Period</p>
      </div>
      <div className="px-5 pb-5 space-y-5">
        {/* Call Minutes */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[14px] font-medium text-[#242529]">Call Minutes</span>
            <div className="text-right">
              <span className="text-[20px] font-bold text-[#242529] tabular-nums tracking-[-0.3px]">{call_minutes_used.toLocaleString()}</span>
              <span className="text-[14px] text-[rgba(0,0,0,0.35)] ml-1">/ {call_minutes_limit.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#f4f4f5]">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="text-[12px] text-[rgba(0,0,0,0.4)]">{remaining.toLocaleString()} remaining</span>
            {overage > 0 && (
              <span className="text-[12px] font-medium text-rose-600">{overage.toLocaleString()} overage</span>
            )}
          </div>
        </div>

        {/* Phone Numbers */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[14px] font-medium text-[#242529]">Phone Numbers</span>
            <div className="text-right">
              <span className="text-[20px] font-bold text-[#242529] tabular-nums tracking-[-0.3px]">{phone_numbers_used}</span>
              <span className="text-[14px] text-[rgba(0,0,0,0.35)] ml-1">/ {phone_numbers_limit}</span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#f4f4f5]">
            <div
              className="h-full rounded-full bg-[#242529] transition-all"
              style={{ width: `${Math.min(phonePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
