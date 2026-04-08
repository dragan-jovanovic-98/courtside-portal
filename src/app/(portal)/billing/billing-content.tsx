"use client";

import { useOrganization } from "@/components/providers/org-provider";
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
  const { organization } = useOrganization();

  async function handleManageBilling() {
    const res = await fetch("/api/billing/create-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanCard
          subscription={subscription}
          onManageBilling={handleManageBilling}
        />
        <UsageMeter subscription={subscription} />
      </div>

      <InvoiceHistory invoices={invoices} />
    </div>
  );
}
