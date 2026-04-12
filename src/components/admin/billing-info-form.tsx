"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization } from "@/lib/types";

interface BillingInfoFormState {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function stateFromOrg(org: Organization): BillingInfoFormState {
  return {
    line1: org.billing_address_line1 ?? "",
    line2: org.billing_address_line2 ?? "",
    city: org.billing_city ?? "",
    state: org.billing_state ?? "",
    postalCode: org.billing_postal_code ?? "",
    country: org.billing_country ?? "",
  };
}

interface BillingInfoFormProps {
  org: Organization;
  /**
   * Variant: "card" renders a styled card with its own header; "inline" renders
   * the fields without a wrapper (for embedding inside another form section).
   */
  variant?: "card" | "inline";
  /**
   * Called after a successful save. If omitted, the page is refreshed via
   * router.refresh().
   */
  onSaved?: () => void;
}

export function BillingInfoForm({ org, variant = "card", onSaved }: BillingInfoFormProps) {
  const router = useRouter();
  const [state, setState] = useState<BillingInfoFormState>(() => stateFromOrg(org));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof BillingInfoFormState>(key: K, value: BillingInfoFormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function validate(): string | null {
    if (!state.line1.trim()) return "Address line 1 is required";
    if (!state.city.trim()) return "City is required";
    if (!state.postalCode.trim()) return "Postal code is required";
    if (!state.country.trim()) return "Country is required";
    return null;
  }

  async function handleSave() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError(null);
    setMessage(null);
    setSaving(true);

    const supabase = createClient();
    const { error: err } = await supabase.functions.invoke("portal-billing", {
      body: {
        action: "update-org-billing-info",
        orgId: org.id,
        billingAddressLine1: state.line1.trim(),
        billingAddressLine2: state.line2.trim() || null,
        billingCity: state.city.trim(),
        billingState: state.state.trim() || null,
        billingPostalCode: state.postalCode.trim(),
        billingCountry: state.country.trim().toUpperCase(),
      },
    });

    setSaving(false);

    if (err) {
      const body = await err.context?.text?.();
      setError(body || err.message || "Failed to save billing info");
      return;
    }

    setMessage("Billing info saved.");
    if (onSaved) {
      onSaved();
    } else {
      router.refresh();
    }
  }

  const fields = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="line1" className="text-[13px] text-[rgba(0,0,0,0.55)]">Address line 1</Label>
          <Input
            id="line1"
            value={state.line1}
            onChange={(e) => update("line1", e.target.value)}
            placeholder="123 Main St"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="line2" className="text-[13px] text-[rgba(0,0,0,0.55)]">Address line 2 (optional)</Label>
          <Input
            id="line2"
            value={state.line2}
            onChange={(e) => update("line2", e.target.value)}
            placeholder="Suite 400"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-[13px] text-[rgba(0,0,0,0.55)]">City</Label>
          <Input
            id="city"
            value={state.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Toronto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state" className="text-[13px] text-[rgba(0,0,0,0.55)]">State / Province</Label>
          <Input
            id="state"
            value={state.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="ON"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode" className="text-[13px] text-[rgba(0,0,0,0.55)]">Postal code</Label>
          <Input
            id="postalCode"
            value={state.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
            placeholder="M5V 2T6"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country" className="text-[13px] text-[rgba(0,0,0,0.55)]">Country</Label>
          <Select value={state.country} onValueChange={(v) => update("country", v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CA">Canada (tax enabled)</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="AU">Australia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {message}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save billing info"}
        </Button>
      </div>
    </>
  );

  if (variant === "inline") {
    return fields;
  }

  return (
    <section>
      <h2 className="mb-3 text-[14px] font-semibold text-[#242529]">Billing address</h2>
      <p className="mb-4 text-[12px] text-[rgba(0,0,0,0.55)]">
        Required for plan activation. Pushed to Stripe as the customer address.
        Canadian addresses enable automatic sales tax collection.
      </p>
      <div className="rounded-lg border border-[#eeeff1] p-4">{fields}</div>
    </section>
  );
}
