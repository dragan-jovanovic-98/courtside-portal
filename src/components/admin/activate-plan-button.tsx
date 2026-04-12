"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ActivatePlanButton({
  orgId,
  planId,
}: {
  orgId: string;
  planId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    if (!confirm("Activate this plan on this org? This creates a Stripe subscription and (if applicable) a setup fee invoice.")) return;

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase.functions.invoke("portal-billing", {
      body: { action: "activate-plan-on-org", orgId, planId },
    });

    setBusy(false);

    if (err) {
      const body = await err.context?.text?.();
      setError(body || err.message || "Activation failed");
      return;
    }

    // Data is the edge function response: { setupInvoiceId, subscriptionId, status }
    console.log("[activate-plan-on-org]", data);
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" variant="outline" onClick={handleActivate} disabled={busy}>
          Retry
        </Button>
        <span className="text-[11px] text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={handleActivate} disabled={busy}>
      {busy ? "Activating..." : "Activate"}
    </Button>
  );
}
