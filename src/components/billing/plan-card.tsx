"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import type { Subscription } from "@/lib/types";

interface PlanCardProps {
  subscription: Subscription | null;
  onManageBilling: () => void;
}

export function PlanCard({ subscription, onManageBilling }: PlanCardProps) {
  const { organization } = useOrganization();
  const tz = organization.timezone;

  return (
    <div className="rounded-[10px] border border-[#eeeff1] bg-white">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Current Plan</p>
      </div>
      <div className="px-5 pb-5">
        {subscription ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-[24px] font-bold text-[#242529] tracking-[-0.5px]">
                  {subscription.plan_name || "Custom Plan"}
                </p>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 capitalize">
                  {subscription.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-0 text-[14px] text-[rgba(0,0,0,0.55)]">
                {subscription.price_monthly != null && subscription.price_monthly > 0 && (
                  <>
                    <span className="font-semibold text-[#242529]">${subscription.price_monthly.toLocaleString()}</span>/mo
                  </>
                )}
                {subscription.call_minutes_limit > 0 && (
                  <>
                    {subscription.price_monthly != null && subscription.price_monthly > 0 && (
                      <span className="mx-2 text-[rgba(0,0,0,0.2)]">·</span>
                    )}
                    {subscription.call_minutes_limit.toLocaleString()} min included
                  </>
                )}
              </div>
            </div>

            {subscription.current_period_end && (
              <p className="text-[13px] text-[rgba(0,0,0,0.45)]">
                Next billing: {formatDate(subscription.current_period_end, tz)}
              </p>
            )}

            <div className="pt-1">
              <button onClick={onManageBilling} className="flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] font-medium bg-white border border-[#e5e5e5] text-[#525866] hover:bg-[#f8f9fa] transition-colors">
                <CreditCard className="h-3.5 w-3.5" />
                Manage Billing
                <ExternalLink className="h-3 w-3 text-[rgba(0,0,0,0.3)]" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <CreditCard className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
            <p className="mt-4 text-[14px] font-medium text-[#242529]">No active plan</p>
            <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Your plan will appear here once activated. Contact us to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
