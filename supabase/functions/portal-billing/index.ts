// portal-billing
//
// Single entry point for all Stripe-facing billing actions. The client portal
// and the future admin portal both call this via supabase.functions.invoke().
// Action is dispatched via the `action` field in the request body.
//
// Actions:
//   - create-plan              : owner/admin — create a Stripe Product+Price and a portal_plans row
//   - activate-plan-on-org     : owner/admin — setup fee invoice + subscription with trial bridge
//   - create-portal-session    : owner/admin — Stripe Customer Portal URL
//   - list-payment-methods     : owner/admin — list saved cards for the org's customer
//   - refresh-usage            : owner/admin (single org) OR super_admin (all orgs) — rollup call minutes
//   - close-period             : super_admin  — compute overage and create Stripe Invoice Items
//   - issue-credit             : super_admin  — negative invoice item on the customer
//
// verify_jwt: true. Both portals send their user's JWT; admin portal uses super_admin JWTs.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@17.5.0";
import { getStripe } from "./stripe.ts";
import {
  AuthError,
  CORS_HEADERS,
  errorResponse,
  getServiceClient,
  hasWorkerSecret,
  jsonResponse,
  requireOrgRole,
  requireSuperAdmin,
} from "./auth.ts";

// deno-lint-ignore no-explicit-any
type JsonBody = Record<string, any>;

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  let body: JsonBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const action = body?.action;
  if (!action || typeof action !== "string") {
    return errorResponse("Missing or invalid `action`");
  }

  try {
    switch (action) {
      case "create-plan":
        return await createPlan(req, body);
      case "activate-plan-on-org":
        return await activatePlanOnOrg(req, body);
      case "create-portal-session":
        return await createPortalSession(req, body);
      case "list-payment-methods":
        return await listPaymentMethods(req, body);
      case "refresh-usage":
        return await refreshUsage(req, body);
      case "close-period":
        return await closePeriod(req, body);
      case "issue-credit":
        return await issueCredit(req, body);
      default:
        return errorResponse(`Unknown action: ${action}`);
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error("[portal-billing]", action, "error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
});

// =============================================================================
// create-plan
// =============================================================================
async function createPlan(req: Request, body: JsonBody): Promise<Response> {
  const {
    orgId,
    name,
    monthlyBasePriceCents,
    includedMinutes,
    overagePerMinuteCents,
    setupFeeCents,
    setupFeeCoversDays,
    currency,
  } = body;

  if (!orgId || !name || monthlyBasePriceCents == null || includedMinutes == null) {
    return errorResponse(
      "Required: orgId, name, monthlyBasePriceCents, includedMinutes",
    );
  }
  if (monthlyBasePriceCents < 0 || includedMinutes < 0) {
    return errorResponse("Prices and minutes must be non-negative");
  }

  await requireOrgRole(req, orgId, ["owner", "admin"]);

  const stripe = getStripe();
  const supabase = getServiceClient();
  const planCurrency = (currency || "usd").toLowerCase();

  // Create Stripe Product
  const product = await stripe.products.create({
    name,
    type: "service",
    metadata: { org_id: orgId, portal_plan: "true" },
  });

  // Create Stripe Price — recurring monthly, licensed (not metered)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: monthlyBasePriceCents,
    currency: planCurrency,
    recurring: { interval: "month", usage_type: "licensed" },
  });

  // Insert portal_plans row
  const { data: plan, error } = await supabase
    .from("portal_plans")
    .insert({
      org_id: orgId,
      name,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      monthly_base_price_cents: monthlyBasePriceCents,
      included_minutes: includedMinutes,
      overage_per_minute_cents: overagePerMinuteCents ?? 0,
      setup_fee_cents: setupFeeCents ?? 0,
      setup_fee_covers_days: setupFeeCoversDays ?? 0,
      currency: planCurrency,
    })
    .select("*")
    .single();

  if (error) {
    // If DB insert failed, we've orphaned a Stripe Product+Price. Flag it.
    throw new Error(
      `Plan created in Stripe (${product.id}/${price.id}) but DB insert failed: ${error.message}`,
    );
  }

  return jsonResponse({ plan });
}

// =============================================================================
// activate-plan-on-org
// =============================================================================
async function activatePlanOnOrg(req: Request, body: JsonBody): Promise<Response> {
  const { orgId, planId } = body;
  if (!orgId || !planId) {
    return errorResponse("Required: orgId, planId");
  }

  await requireOrgRole(req, orgId, ["owner", "admin"]);

  const stripe = getStripe();
  const supabase = getServiceClient();

  const { data: org, error: orgErr } = await supabase
    .from("portal_organizations")
    .select("id, stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();

  if (orgErr || !org) return errorResponse("Org not found", 404);
  if (!org.stripe_customer_id) {
    return errorResponse(
      "Org has no Stripe customer yet. Wait for the customer worker to run or invoke it manually.",
      409,
    );
  }

  const { data: plan, error: planErr } = await supabase
    .from("portal_plans")
    .select("*")
    .eq("id", planId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (planErr || !plan) return errorResponse("Plan not found or not owned by org", 404);
  if (!plan.stripe_price_id) {
    return errorResponse("Plan has no Stripe Price ID — re-create via create-plan", 500);
  }

  // Step 1: Setup fee invoice (if applicable)
  let setupInvoiceId: string | null = null;
  if (plan.setup_fee_cents > 0) {
    await stripe.invoiceItems.create({
      customer: org.stripe_customer_id,
      amount: plan.setup_fee_cents,
      currency: plan.currency,
      description: `Setup fee: ${plan.name}`,
      metadata: { org_id: orgId, plan_id: planId, kind: "setup_fee" },
    });

    const invoice = await stripe.invoices.create({
      customer: org.stripe_customer_id,
      auto_advance: true,
      collection_method: "charge_automatically",
      metadata: { org_id: orgId, plan_id: planId, kind: "setup_fee" },
    });

    setupInvoiceId = invoice.id ?? null;
  }

  // Step 2: Create subscription with trial_period_days bridging the setup period
  const subParams: Stripe.SubscriptionCreateParams = {
    customer: org.stripe_customer_id,
    items: [{ price: plan.stripe_price_id }],
    collection_method: "charge_automatically",
    metadata: { org_id: orgId, plan_id: planId },
  };

  if (plan.setup_fee_covers_days > 0) {
    subParams.trial_period_days = plan.setup_fee_covers_days;
  }

  const subscription = await stripe.subscriptions.create(subParams);

  // Webhook will upsert portal_subscriptions when the customer.subscription.created event arrives
  return jsonResponse({
    setupInvoiceId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

// =============================================================================
// create-portal-session
// =============================================================================
async function createPortalSession(req: Request, body: JsonBody): Promise<Response> {
  const { orgId, returnUrl } = body;
  if (!orgId) return errorResponse("Required: orgId");

  await requireOrgRole(req, orgId, ["owner", "admin"]);

  const stripe = getStripe();
  const supabase = getServiceClient();

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return errorResponse("Org has no Stripe customer yet", 409);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl || "https://app.court-side.ai/billing",
  });

  return jsonResponse({ url: session.url });
}

// =============================================================================
// list-payment-methods
// =============================================================================
async function listPaymentMethods(req: Request, body: JsonBody): Promise<Response> {
  const { orgId } = body;
  if (!orgId) return errorResponse("Required: orgId");

  await requireOrgRole(req, orgId, ["owner", "admin"]);

  const stripe = getStripe();
  const supabase = getServiceClient();

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return jsonResponse({ methods: [], defaultId: null });
  }

  // List card payment methods
  const pmList = await stripe.paymentMethods.list({
    customer: org.stripe_customer_id,
    type: "card",
  });

  // Get default payment method from the customer
  const customer = await stripe.customers.retrieve(org.stripe_customer_id);
  let defaultId: string | null = null;
  if (customer && !customer.deleted) {
    const c = customer as Stripe.Customer;
    const inv = c.invoice_settings?.default_payment_method;
    defaultId = typeof inv === "string" ? inv : inv?.id ?? null;
  }

  const methods = pmList.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? "unknown",
    last4: pm.card?.last4 ?? "",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
  }));

  return jsonResponse({ methods, defaultId });
}

// =============================================================================
// refresh-usage
// =============================================================================
// Recalculates portal_subscriptions.call_minutes_used from portal_calls for
// every active subscription (or a specific orgId).
//
// Minute source: portal_calls.duration_seconds / 60, filtered by
// started_at within [current_period_start, current_period_end).
async function refreshUsage(req: Request, body: JsonBody): Promise<Response> {
  const { orgId } = body;

  if (orgId) {
    // Single-org mode: caller must be owner/admin of that org
    await requireOrgRole(req, orgId, ["owner", "admin"]);
    const count = await refreshOrgUsage(orgId);
    return jsonResponse({ refreshed: 1, orgs: [{ orgId, updated: count }] });
  }

  // All-orgs mode: super_admin or worker-secret (for cron invocation)
  if (!hasWorkerSecret(req)) {
    await requireSuperAdmin(req);
  }

  const supabase = getServiceClient();
  const { data: activeSubs } = await supabase
    .from("portal_subscriptions")
    .select("org_id")
    .in("status", ["active", "trialing", "past_due"]);

  const results: Array<{ orgId: string; updated: number }> = [];
  for (const sub of activeSubs ?? []) {
    const updated = await refreshOrgUsage(sub.org_id);
    results.push({ orgId: sub.org_id, updated });
  }

  return jsonResponse({ refreshed: results.length, orgs: results });
}

// Compute the current billing cycle window anchored to the subscription's
// created_at day-of-month. Cycles roll over monthly on the anchor day. For
// anchor days beyond the end of a given month (e.g. 31 in Feb), the cycle
// boundary is clamped to the last day of that month.
export function getCurrentCycleWindow(
  anchorDate: Date,
  now: Date = new Date(),
): { start: Date; end: Date } {
  let cycleStart = new Date(anchorDate);
  let cycleEnd = addMonthsPreservingEndOfMonth(cycleStart, 1);

  while (now.getTime() >= cycleEnd.getTime()) {
    cycleStart = cycleEnd;
    cycleEnd = addMonthsPreservingEndOfMonth(cycleStart, 1);
  }

  return { start: cycleStart, end: cycleEnd };
}

function addMonthsPreservingEndOfMonth(date: Date, months: number): Date {
  const anchorDay = date.getUTCDate();
  const result = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    1,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(anchorDay, lastDayOfTargetMonth));
  return result;
}

async function refreshOrgUsage(orgId: string): Promise<number> {
  const supabase = getServiceClient();

  const { data: sub } = await supabase
    .from("portal_subscriptions")
    .select("id, created_at")
    .eq("org_id", orgId)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle();

  if (!sub) return 0;

  // Anchor-day cycle: [start, end) where start is the most recent anchor day
  // on or before now, and end is the next anchor day after now.
  const { start, end } = getCurrentCycleWindow(new Date(sub.created_at));

  const { data: calls } = await supabase
    .from("portal_calls")
    .select("duration_seconds")
    .eq("org_id", orgId)
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString());

  const totalSeconds = (calls ?? []).reduce(
    (acc: number, c: { duration_seconds: number | null }) =>
      acc + (c.duration_seconds ?? 0),
    0,
  );
  const totalMinutes = Math.ceil(totalSeconds / 60);

  const { error } = await supabase
    .from("portal_subscriptions")
    .update({ call_minutes_used: totalMinutes })
    .eq("id", sub.id);

  if (error) throw new Error(`Failed to update call_minutes_used: ${error.message}`);

  return totalMinutes;
}

// =============================================================================
// close-period
// =============================================================================
// For each subscription past current_period_end: refresh usage, compute overage,
// create a Stripe Invoice Item if overage > 0.
async function closePeriod(req: Request, body: JsonBody): Promise<Response> {
  // super_admin OR worker-secret (for cron invocation)
  if (!hasWorkerSecret(req)) {
    await requireSuperAdmin(req);
  }

  const { subscriptionId } = body; // optional: close a specific sub only
  const stripe = getStripe();
  const supabase = getServiceClient();

  // Fetch all active subs with their plans. We filter in JS for subs whose
  // cycle just rolled over (cycle start is today), since Postgres doesn't
  // know about the anchor-day logic.
  const query = supabase
    .from("portal_subscriptions")
    .select(`
      id, org_id, plan_id, stripe_subscription_id, created_at,
      portal_plans!plan_id ( included_minutes, overage_per_minute_cents, currency, name )
    `)
    .in("status", ["active", "trialing", "past_due"]);

  const { data: allSubs, error } = subscriptionId
    ? await query.eq("id", subscriptionId)
    : await query;

  if (error) throw new Error(`Subscription lookup failed: ${error.message}`);

  // When invoked without subscriptionId, only close subs whose cycle just rolled
  // over (cycle start is today). With subscriptionId, close that specific sub
  // regardless — useful for manual testing.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const subs = subscriptionId
    ? allSubs
    : (allSubs ?? []).filter((s) => {
      const { start } = getCurrentCycleWindow(new Date(s.created_at));
      const startDay = new Date(start);
      startDay.setUTCHours(0, 0, 0, 0);
      return startDay.getTime() === today.getTime();
    });

  const results: Array<{
    subscriptionId: string;
    orgId: string;
    usedMinutes: number;
    includedMinutes: number;
    overageMinutes: number;
    overageCents: number;
    invoiceItemId: string | null;
  }> = [];

  for (const sub of subs ?? []) {
    // When closing a specific subscription manually, we close the CURRENT
    // cycle's usage. When closing via cron (cycle just rolled over), we close
    // the PREVIOUS cycle's usage (which covers the full month that just ended).
    const { start: currentCycleStart } = getCurrentCycleWindow(new Date(sub.created_at));
    const targetCycleStart = subscriptionId
      ? currentCycleStart
      : addMonthsPreservingEndOfMonth(currentCycleStart, -1);
    const targetCycleEnd = subscriptionId
      ? addMonthsPreservingEndOfMonth(currentCycleStart, 1)
      : currentCycleStart;

    // Compute usage for the target cycle directly (don't use refreshOrgUsage
    // because that always computes the CURRENT cycle).
    const { data: calls } = await supabase
      .from("portal_calls")
      .select("duration_seconds")
      .eq("org_id", sub.org_id)
      .gte("started_at", targetCycleStart.toISOString())
      .lt("started_at", targetCycleEnd.toISOString());

    const totalSeconds = (calls ?? []).reduce(
      (acc: number, c: { duration_seconds: number | null }) =>
        acc + (c.duration_seconds ?? 0),
      0,
    );
    const used = Math.ceil(totalSeconds / 60);

    // deno-lint-ignore no-explicit-any
    const plan = (sub as any).portal_plans;
    if (!plan) continue;

    const included = plan.included_minutes ?? 0;
    const rate = plan.overage_per_minute_cents ?? 0;
    const overageMinutes = Math.max(0, used - included);
    const overageCents = overageMinutes * rate;

    let invoiceItemId: string | null = null;
    if (overageCents > 0 && rate > 0) {
      const { data: org } = await supabase
        .from("portal_organizations")
        .select("stripe_customer_id")
        .eq("id", sub.org_id)
        .single();

      if (org?.stripe_customer_id) {
        const item = await stripe.invoiceItems.create({
          customer: org.stripe_customer_id,
          amount: overageCents,
          currency: plan.currency || "usd",
          description: `Overage: ${overageMinutes} minutes × $${(rate / 100).toFixed(2)}/min`,
          metadata: {
            org_id: sub.org_id,
            plan_id: sub.plan_id ?? "",
            kind: "overage",
            period_start: targetCycleStart.toISOString(),
            period_end: targetCycleEnd.toISOString(),
          },
        });
        invoiceItemId = item.id ?? null;
      }
    }

    results.push({
      subscriptionId: sub.stripe_subscription_id ?? sub.id,
      orgId: sub.org_id,
      usedMinutes: used,
      includedMinutes: included,
      overageMinutes,
      overageCents,
      invoiceItemId,
    });
  }

  return jsonResponse({ closed: results.length, results });
}

// =============================================================================
// issue-credit (super_admin only)
// =============================================================================
async function issueCredit(req: Request, body: JsonBody): Promise<Response> {
  if (!hasWorkerSecret(req)) {
    await requireSuperAdmin(req);
  }

  const { orgId, amountCents, description } = body;
  if (!orgId || amountCents == null || !description) {
    return errorResponse("Required: orgId, amountCents, description");
  }
  if (amountCents <= 0) {
    return errorResponse("amountCents must be positive (we negate it for the credit)");
  }

  const stripe = getStripe();
  const supabase = getServiceClient();

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return errorResponse("Org has no Stripe customer", 409);
  }

  const item = await stripe.invoiceItems.create({
    customer: org.stripe_customer_id,
    amount: -amountCents,
    currency: "usd",
    description,
    metadata: { org_id: orgId, kind: "credit" },
  });

  return jsonResponse({ invoiceItemId: item.id });
}
