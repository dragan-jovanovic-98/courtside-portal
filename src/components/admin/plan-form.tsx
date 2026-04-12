"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { BillingInfoForm } from "@/components/admin/billing-info-form";
import type { Organization, Plan } from "@/lib/types";

type PlanWithOrgName = Plan & { _orgName: string };

interface PlanFormState {
  name: string;
  monthlyBaseDollars: string;
  includedMinutes: string;
  overagePerMinuteDollars: string;
  setupFeeDollars: string;
  setupFeeCoversDays: string;
  currency: string;
}

const EMPTY: PlanFormState = {
  name: "",
  monthlyBaseDollars: "",
  includedMinutes: "",
  overagePerMinuteDollars: "0",
  setupFeeDollars: "0",
  setupFeeCoversDays: "0",
  currency: "usd",
};

export function PlanForm({
  org,
  existingPlans,
}: {
  org: Organization;
  existingPlans: PlanWithOrgName[];
}) {
  const router = useRouter();
  const [state, setState] = useState<PlanFormState>(EMPTY);
  const [duplicateFromId, setDuplicateFromId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"create" | "create-activate" | null>(null);

  const needsBillingInfo = !org.billing_address_line1
    || !org.billing_city
    || !org.billing_postal_code
    || !org.billing_country;

  function update<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function handleDuplicate(planId: string | null) {
    setDuplicateFromId(planId ?? "");
    if (!planId) return;
    const source = existingPlans.find((p) => p.id === planId);
    if (!source) return;
    setState({
      name: source.name,
      monthlyBaseDollars: (source.monthly_base_price_cents / 100).toString(),
      includedMinutes: source.included_minutes.toString(),
      overagePerMinuteDollars: (source.overage_per_minute_cents / 100).toString(),
      setupFeeDollars: (source.setup_fee_cents / 100).toString(),
      setupFeeCoversDays: source.setup_fee_covers_days.toString(),
      currency: source.currency,
    });
  }

  function validate(): string | null {
    if (!state.name.trim()) return "Name is required";
    const monthly = Number(state.monthlyBaseDollars);
    if (!Number.isFinite(monthly) || monthly < 0) return "Monthly base price must be ≥ 0";
    const minutes = Number(state.includedMinutes);
    if (!Number.isInteger(minutes) || minutes < 0) return "Included minutes must be an integer ≥ 0";
    const overage = Number(state.overagePerMinuteDollars);
    if (!Number.isFinite(overage) || overage < 0) return "Overage per minute must be ≥ 0";
    const setup = Number(state.setupFeeDollars);
    if (!Number.isFinite(setup) || setup < 0) return "Setup fee must be ≥ 0";
    const coversDays = Number(state.setupFeeCoversDays);
    if (!Number.isInteger(coversDays) || coversDays < 0) return "Setup fee covers days must be integer ≥ 0";
    return null;
  }

  function toCreatePlanPayload() {
    return {
      orgId: org.id,
      name: state.name.trim(),
      monthlyBasePriceCents: Math.round(Number(state.monthlyBaseDollars) * 100),
      includedMinutes: parseInt(state.includedMinutes, 10),
      overagePerMinuteCents: Math.round(Number(state.overagePerMinuteDollars) * 100),
      setupFeeCents: Math.round(Number(state.setupFeeDollars) * 100),
      setupFeeCoversDays: parseInt(state.setupFeeCoversDays, 10),
      currency: state.currency,
    };
  }

  async function handleSubmit(activate: boolean) {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(activate ? "create-activate" : "create");

    const supabase = createClient();

    try {
      const { data: createData, error: createError } = await supabase.functions.invoke(
        "portal-billing",
        {
          body: { action: "create-plan", ...toCreatePlanPayload() },
        },
      );

      if (createError) {
        const body = await createError.context?.text?.();
        throw new Error(body || createError.message || "Failed to create plan");
      }

      const newPlanId = (createData as { plan?: { id?: string } })?.plan?.id;
      if (!newPlanId) {
        throw new Error("Plan created but response missing plan ID");
      }

      if (activate) {
        const { data: activateData, error: activateError } = await supabase.functions.invoke(
          "portal-billing",
          {
            body: {
              action: "activate-plan-on-org",
              orgId: org.id,
              planId: newPlanId,
            },
          },
        );

        if (activateError) {
          const body = await activateError.context?.text?.();
          throw new Error(
            `Plan created but activation failed: ${body || activateError.message}`,
          );
        }

        const result = activateData as {
          setupInvoiceId?: string | null;
          subscriptionId?: string;
          status?: string;
        };
        setMessage(
          `Plan created and activated. Subscription ${result.subscriptionId} · status ${result.status}${
            result.setupInvoiceId ? ` · setup invoice ${result.setupInvoiceId}` : ""
          }`,
        );
      } else {
        setMessage(`Plan ${newPlanId} created. Return to the org to activate.`);
      }

      // Brief delay so the user can see the confirmation, then navigate back.
      setTimeout(() => {
        router.push(`/admin/orgs/${org.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  }

  const showSetupCoverage = Number(state.setupFeeDollars) > 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/orgs/${org.id}`}
          className="text-[12px] text-[rgba(0,0,0,0.55)] hover:text-[#242529]"
        >
          ← Back to {org.name}
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold text-[#242529]">Create plan</h1>
        <p className="text-[13px] text-[rgba(0,0,0,0.55)]">
          Custom plan for <strong>{org.name}</strong>. A new Stripe Product + Price will be
          created and linked.
        </p>
      </div>

      {/* Billing info section — only shown if the org doesn't have one yet */}
      {needsBillingInfo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-[14px] font-semibold text-[#242529]">Billing address required</h2>
          <p className="mt-1 text-[12px] text-[rgba(0,0,0,0.55)]">
            This org doesn&apos;t have a billing address yet. Activation requires one.
            Enter it here and save before creating the plan. Canadian addresses enable automatic sales tax.
          </p>
          <div className="mt-4">
            <BillingInfoForm org={org} variant="inline" />
          </div>
        </div>
      )}

      {/* Duplicate picker */}
      {existingPlans.length > 0 && (
        <div className="mb-6 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-4">
          <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">
            Duplicate from existing plan (optional)
          </Label>
          <Select value={duplicateFromId} onValueChange={handleDuplicate}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue placeholder="Pick a plan to pre-fill this form..." />
            </SelectTrigger>
            <SelectContent>
              {existingPlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} · {plan._orgName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[12px] text-[rgba(0,0,0,0.35)]">
            Picking a plan copies its values into the form. A fresh plan row and Stripe objects
            are created on submit.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="planName" className="text-[13px] text-[rgba(0,0,0,0.55)]">
            Plan name
          </Label>
          <Input
            id="planName"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Kings Court Standard"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="monthly" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Monthly base price (USD)
            </Label>
            <Input
              id="monthly"
              type="number"
              min="0"
              step="0.01"
              value={state.monthlyBaseDollars}
              onChange={(e) => update("monthlyBaseDollars", e.target.value)}
              placeholder="500.00"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Currency
            </Label>
            <Select value={state.currency} onValueChange={(v) => update("currency", v ?? "usd")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="cad">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="includedMinutes" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Included minutes / month
            </Label>
            <Input
              id="includedMinutes"
              type="number"
              min="0"
              step="1"
              value={state.includedMinutes}
              onChange={(e) => update("includedMinutes", e.target.value)}
              placeholder="750"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overage" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Overage per minute
            </Label>
            <Input
              id="overage"
              type="number"
              min="0"
              step="0.01"
              value={state.overagePerMinuteDollars}
              onChange={(e) => update("overagePerMinuteDollars", e.target.value)}
              placeholder="0.50"
            />
            <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Set to 0 for no overage billing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="setupFee" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Setup fee
            </Label>
            <Input
              id="setupFee"
              type="number"
              min="0"
              step="0.01"
              value={state.setupFeeDollars}
              onChange={(e) => update("setupFeeDollars", e.target.value)}
              placeholder="0"
            />
            <p className="text-[12px] text-[rgba(0,0,0,0.35)]">
              One-time charged at activation. Set to 0 for no setup fee.
            </p>
          </div>
          {showSetupCoverage && (
            <div className="space-y-1.5">
              <Label htmlFor="coverDays" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                Setup fee covers (days)
              </Label>
              <Input
                id="coverDays"
                type="number"
                min="0"
                step="1"
                value={state.setupFeeCoversDays}
                onChange={(e) => update("setupFeeCoversDays", e.target.value)}
                placeholder="0"
              />
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">
                Subscription trial length. First recurring invoice lands on day N+1.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {message}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting !== null}
        >
          {submitting === "create" ? "Creating..." : "Create plan"}
        </Button>
        <Button
          size="sm"
          onClick={() => handleSubmit(true)}
          disabled={submitting !== null || needsBillingInfo}
          title={needsBillingInfo ? "Save billing address first to enable activation" : undefined}
        >
          {submitting === "create-activate" ? "Creating & activating..." : "Create & activate"}
        </Button>
      </div>
      {needsBillingInfo && (
        <p className="mt-2 text-[12px] text-[rgba(0,0,0,0.55)]">
          &ldquo;Create &amp; activate&rdquo; is disabled until the billing address is saved.
        </p>
      )}
    </div>
  );
}
