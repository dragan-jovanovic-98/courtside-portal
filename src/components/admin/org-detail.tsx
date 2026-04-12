import Link from "next/link";
import { Plus } from "lucide-react";
import { ActivatePlanButton } from "@/components/admin/activate-plan-button";
import type { Organization, Plan, Subscription, Invoice } from "@/lib/types";

const NON_TERMINAL = new Set(["active", "trialing", "past_due", "incomplete"]);

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const tone: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trialing: "bg-blue-50 text-blue-700 border-blue-200",
    past_due: "bg-amber-50 text-amber-700 border-amber-200",
    incomplete: "bg-zinc-50 text-zinc-700 border-zinc-200",
    canceled: "bg-zinc-50 text-zinc-500 border-zinc-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    open: "bg-blue-50 text-blue-700 border-blue-200",
    draft: "bg-zinc-50 text-zinc-500 border-zinc-200",
    void: "bg-zinc-50 text-zinc-500 border-zinc-200",
    payment_failed: "bg-red-50 text-red-700 border-red-200",
    uncollectible: "bg-red-50 text-red-700 border-red-200",
  };
  const classes = tone[status] ?? "bg-zinc-50 text-zinc-700 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function OrgDetail({
  org,
  plans,
  subscriptions,
  invoices,
}: {
  org: Organization;
  plans: Plan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
}) {
  const activeSub = subscriptions.find((s) => NON_TERMINAL.has(s.status));
  const activePlan = activeSub?.plan_id
    ? plans.find((p) => p.id === activeSub.plan_id)
    : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/orgs"
            className="text-[12px] text-[rgba(0,0,0,0.55)] hover:text-[#242529]"
          >
            ← All organizations
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold text-[#242529]">{org.name}</h1>
          <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{org.slug}</p>
        </div>
        <Link
          href={`/admin/orgs/${org.id}/plans/new`}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[12px] bg-[#242529] px-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#242529]/85"
        >
          <Plus className="h-3.5 w-3.5" />
          Create plan
        </Link>
      </div>

      {/* Org info */}
      <section>
        <h2 className="mb-3 text-[14px] font-semibold text-[#242529]">Organization</h2>
        <dl className="grid grid-cols-1 gap-3 rounded-lg border border-[#eeeff1] p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Primary email</dt>
            <dd className="text-[13px] text-[#242529]">{org.primary_email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Billing email</dt>
            <dd className="text-[13px] text-[#242529]">{org.billing_email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Industry</dt>
            <dd className="text-[13px] text-[#242529]">{org.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Stripe customer ID</dt>
            <dd className="font-mono text-[12px] text-[#242529]">
              {org.stripe_customer_id ?? (
                <span className="text-[rgba(0,0,0,0.35)]">Not linked</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Created</dt>
            <dd className="text-[13px] text-[#242529]">{formatDate(org.created_at)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-medium text-[rgba(0,0,0,0.55)]">Timezone</dt>
            <dd className="text-[13px] text-[#242529]">{org.timezone}</dd>
          </div>
        </dl>
      </section>

      {/* Active subscription */}
      <section>
        <h2 className="mb-3 text-[14px] font-semibold text-[#242529]">Active subscription</h2>
        {activeSub ? (
          <div className="rounded-lg border border-[#eeeff1] p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-[#242529]">
                    {activeSub.plan_name ?? "Unnamed plan"}
                  </span>
                  {statusBadge(activeSub.status)}
                </div>
                <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
                  {activeSub.price_monthly != null
                    ? `$${activeSub.price_monthly}/mo`
                    : "—"}
                  {activePlan?.overage_per_minute_cents
                    ? ` · ${formatCents(activePlan.overage_per_minute_cents, activePlan.currency)}/min overage`
                    : ""}
                </p>
                <p className="mt-2 text-[12px] text-[rgba(0,0,0,0.55)]">
                  Current period: {formatDate(activeSub.current_period_start)} →{" "}
                  {formatDate(activeSub.current_period_end)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase text-[rgba(0,0,0,0.55)]">
                  Usage this period
                </p>
                <p className="text-[18px] font-semibold text-[#242529]">
                  {activeSub.call_minutes_used}
                  <span className="text-[13px] font-normal text-[rgba(0,0,0,0.55)]">
                    {" "}
                    / {activeSub.call_minutes_limit} min
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[#eeeff1] p-6 text-center text-[13px] text-[rgba(0,0,0,0.55)]">
            No active subscription. Create a plan to get started.
          </p>
        )}
      </section>

      {/* Plan history */}
      <section>
        <h2 className="mb-3 text-[14px] font-semibold text-[#242529]">
          Plans ({plans.length})
        </h2>
        {plans.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#eeeff1]">
            <table className="w-full text-[13px]">
              <thead className="bg-[#fbfbfb]">
                <tr className="text-left text-[12px] font-medium text-[rgba(0,0,0,0.55)]">
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Monthly</th>
                  <th className="px-3 py-2.5 font-medium">Minutes</th>
                  <th className="px-3 py-2.5 font-medium">Overage</th>
                  <th className="px-3 py-2.5 font-medium">Setup fee</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-3 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isCurrent = activeSub?.plan_id === plan.id;
                  return (
                    <tr key={plan.id} className="border-t border-[#eeeff1]">
                      <td className="px-3 py-2.5 font-medium text-[#242529]">{plan.name}</td>
                      <td className="px-3 py-2.5 text-[#242529]">
                        {formatCents(plan.monthly_base_price_cents, plan.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-[#242529]">{plan.included_minutes}</td>
                      <td className="px-3 py-2.5 text-[#242529]">
                        {plan.overage_per_minute_cents
                          ? `${formatCents(plan.overage_per_minute_cents, plan.currency)}/min`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[#242529]">
                        {plan.setup_fee_cents
                          ? `${formatCents(plan.setup_fee_cents, plan.currency)} · ${plan.setup_fee_covers_days}d`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[rgba(0,0,0,0.55)]">
                        {formatDate(plan.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            Current
                          </span>
                        ) : activeSub ? (
                          <span className="text-[11px] text-[rgba(0,0,0,0.35)]">
                            Another plan active
                          </span>
                        ) : (
                          <ActivatePlanButton orgId={org.id} planId={plan.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(0,0,0,0.55)]">No plans created for this org yet.</p>
        )}
      </section>

      {/* Invoice history */}
      <section>
        <h2 className="mb-3 text-[14px] font-semibold text-[#242529]">
          Invoices ({invoices.length})
        </h2>
        {invoices.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#eeeff1]">
            <table className="w-full text-[13px]">
              <thead className="bg-[#fbfbfb]">
                <tr className="text-left text-[12px] font-medium text-[rgba(0,0,0,0.55)]">
                  <th className="px-3 py-2.5 font-medium">Invoice</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-[#eeeff1]">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-[#242529]">
                      {inv.id}
                    </td>
                    <td className="px-3 py-2.5">{statusBadge(inv.status)}</td>
                    <td className="px-3 py-2.5 text-[#242529]">
                      ${inv.amount_due.toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5 text-[rgba(0,0,0,0.55)]">
                      {formatDate(inv.created_at_stripe)}
                    </td>
                    <td className="px-3 py-2.5">
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-[#266df0] hover:underline"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[rgba(0,0,0,0.55)]">No invoices yet.</p>
        )}
      </section>
    </div>
  );
}
