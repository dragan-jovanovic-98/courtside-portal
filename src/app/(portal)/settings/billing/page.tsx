"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export default function SettingsBillingPage() {
  const { organization, user } = useOrganization();

  if (user.role === "member" || user.role === "viewer") {
    return (
      <div className="max-w-2xl">
        <p className="text-[13px] text-[rgba(0,0,0,0.55)]">You don&apos;t have permission to manage billing. Contact your organization admin.</p>
      </div>
    );
  }
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMethods() {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("portal-billing", {
      body: { action: "list-payment-methods", orgId: organization.id },
    });
    if (error) {
      setMethods([]);
      setDefaultId(null);
    } else {
      setMethods(data?.methods || []);
      setDefaultId(data?.defaultId ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMethods();
  }, [organization.id]);

  async function handleManagePortal() {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("portal-billing", {
      body: {
        action: "create-portal-session",
        orgId: organization.id,
        returnUrl: window.location.href,
      },
    });
    if (error || !data?.url) return;
    window.location.href = data.url;
  }

  function brandLabel(brand: string) {
    const map: Record<string, string> = { visa: "Visa", mastercard: "MC", amex: "Amex", discover: "Discover" };
    return map[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  return (
    <div className="max-w-2xl">
      {/* Payment methods */}
      <div className="pb-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#242529]">Payment methods</h2>
            <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              Manage credit cards used for your subscription and usage billing.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleManagePortal} className="shrink-0 gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Add card
          </Button>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-[13px] text-[rgba(0,0,0,0.35)]">Loading payment methods...</p>
          ) : methods.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-[#eeeff1] py-10">
              <CreditCard className="h-8 w-8 text-[rgba(0,0,0,0.2)]" />
              <p className="mt-3 text-[13px] text-[rgba(0,0,0,0.55)]">No payment methods on file.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleManagePortal}>
                Add a card
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between rounded-lg border border-[#eeeff1] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eeeff1]">
                      <CreditCard className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[#242529]">
                          {brandLabel(method.brand)} •••• {method.last4}
                        </span>
                        {method.id === defaultId && (
                          <Badge variant="default" className="text-[10px]">Default</Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-[rgba(0,0,0,0.35)]">
                        Expires {method.expMonth}/{method.expYear}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">
                To remove or change your default card, open the Stripe customer portal below.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Billing management */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Billing & invoices</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          View your usage, invoices, and manage your subscription.
        </p>

        <div className="mt-5 space-y-2">
          <Link
            href="/billing"
            className="flex items-center gap-3 rounded-lg border border-[#eeeff1] px-4 py-3 transition-colors hover:bg-[#f8f9fa]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eeeff1]">
              <FileText className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#242529]">View billing dashboard</p>
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Usage, plan details, and invoice history</p>
            </div>
          </Link>

          <button
            onClick={handleManagePortal}
            className="flex w-full items-center gap-3 rounded-lg border border-[#eeeff1] px-4 py-3 text-left transition-colors hover:bg-[#f8f9fa]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eeeff1]">
              <ExternalLink className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#242529]">Stripe customer portal</p>
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Manage subscription, download invoices, update billing info</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
