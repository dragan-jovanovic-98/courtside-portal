"use client";

import { useState } from "react";
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

  async function openPortal(): Promise<{ ok: true; url: string } | { ok: false; code?: string; error: string }> {
    const res = await fetch("/api/billing/create-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, code: data.code, error: data.error || "Failed to open billing portal" };
    }
    if (!data.url) {
      return { ok: false, error: "Billing portal response missing URL" };
    }
    return { ok: true, url: data.url };
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const first = await openPortal();
      if (first.ok) {
        window.location.href = first.url;
        return;
      }
      if (first.code === "no_billing_account") {
        // Bootstrap a Stripe customer for the org, then retry the portal call once.
        const createRes = await fetch("/api/billing/create-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || "Failed to set up billing account");
        }
        const retry = await openPortal();
        if (!retry.ok) {
          throw new Error(retry.error);
        }
        window.location.href = retry.url;
        return;
      }
      throw new Error(first.error);
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
