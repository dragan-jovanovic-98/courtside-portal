"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UsageMeter } from "@/components/billing/usage-meter";
import { PlanCard } from "@/components/billing/plan-card";
import { InvoiceHistory } from "@/components/billing/invoice-history";
import type { Subscription, Invoice } from "@/lib/types";

interface BillingPageContentProps {
  subscription: Subscription | null;
  invoices: Invoice[];
  orgId: string;
}

export function BillingPageContent({
  subscription,
  invoices,
  orgId,
}: BillingPageContentProps) {
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("portal-billing", {
        body: {
          action: "create-portal-session",
          orgId,
          returnUrl: window.location.href,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to open billing portal");
      }
      if (!data?.url) {
        throw new Error("Billing portal response missing URL");
      }
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Something went wrong");
      setBillingLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {billingError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {billingError}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanCard
          subscription={subscription}
          onManageBilling={handleManageBilling}
          loading={billingLoading}
        />
        <UsageMeter subscription={subscription} />
      </div>

      <InvoiceHistory invoices={invoices} />
    </div>
  );
}
