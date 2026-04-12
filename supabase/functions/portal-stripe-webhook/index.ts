// portal-stripe-webhook
//
// Receives Stripe events and fans out to portal_subscriptions / portal_invoices /
// portal_organizations. Idempotent via portal_stripe_event_log: every event is
// INSERT ... ON CONFLICT (id) DO NOTHING first; duplicate events return 200
// without re-processing.
//
// Deployed with verify_jwt: false because Stripe cannot send Supabase JWTs.
// Auth is via Stripe signature verification against PORTAL_STRIPE_WEBHOOK_SECRET.
//
// Secrets required:
//   PORTAL_STRIPE_SECRET_KEY      — Stripe API key (for constructEventAsync)
//   PORTAL_STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret
//   SUPABASE_URL                  — auto-provided
//   SUPABASE_SERVICE_ROLE_KEY     — auto-provided

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@17.5.0";
import { getStripe, tsFromUnix } from "./stripe.ts";
import { getServiceClient, jsonResponse } from "./auth.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const webhookSecret = Deno.env.get("PORTAL_STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[portal-webhook] PORTAL_STRIPE_WEBHOOK_SECRET not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[portal-webhook] Signature verification failed:", msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  const supabase = getServiceClient();

  // ---------- IDEMPOTENCY ----------
  // Upsert the event into the log. If a previous run already marked it as
  // processed (processed_at IS NOT NULL), short-circuit as duplicate.
  // If it was previously logged but processing FAILED (processed_at IS NULL),
  // re-run the handler — this is the Stripe retry path.
  const { error: upsertErr } = await supabase
    .from("portal_stripe_event_log")
    .upsert(
      {
        id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
  if (upsertErr) {
    console.error("[portal-webhook] Failed to write event log:", upsertErr);
    return jsonResponse({ error: upsertErr.message }, 500);
  }

  const { data: existing } = await supabase
    .from("portal_stripe_event_log")
    .select("processed_at")
    .eq("id", event.id)
    .single();

  if (existing?.processed_at) {
    return jsonResponse({ received: true, duplicate: true });
  }

  // ---------- FAN OUT ----------
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpsert(supabase, event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.created":
      case "invoice.finalized":
      case "invoice.paid":
      case "invoice.payment_failed": {
        await handleInvoiceUpsert(
          supabase,
          event.data.object as Stripe.Invoice,
          event.type,
        );
        break;
      }
      case "customer.updated": {
        await handleCustomerUpdated(supabase, event.data.object as Stripe.Customer);
        break;
      }
      default:
        // Unhandled but acknowledged — logged and skipped.
        break;
    }

    await supabase
      .from("portal_stripe_event_log")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return jsonResponse({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[portal-webhook] Handler error for", event.type, msg);

    await supabase
      .from("portal_stripe_event_log")
      .update({ error: msg })
      .eq("id", event.id);

    // Return 500 so Stripe retries.
    return jsonResponse({ error: msg }, 500);
  }
});

// ---------- HANDLERS ----------

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Look up the org via stripe_customer_id
  const { data: org, error: orgErr } = await supabase
    .from("portal_organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (orgErr) throw new Error(`Org lookup failed: ${orgErr.message}`);
  if (!org) {
    console.warn("[portal-webhook] No org found for customer:", customerId);
    return; // silent — Stripe will stop retrying after we return 200
  }

  // Look up the plan via the subscription's first item's price ID
  const firstItem = sub.items?.data?.[0];
  const priceId = firstItem?.price?.id ?? null;
  let planId: string | null = null;
  let planName: string | null = null;
  let priceMonthly: number | null = null;

  let includedMinutes: number = 0;

  if (priceId) {
    const { data: plan } = await supabase
      .from("portal_plans")
      .select("id, name, monthly_base_price_cents, included_minutes")
      .eq("stripe_price_id", priceId)
      .maybeSingle();

    if (plan) {
      planId = plan.id;
      planName = plan.name;
      priceMonthly = plan.monthly_base_price_cents != null
        ? plan.monthly_base_price_cents / 100
        : null;
      includedMinutes = plan.included_minutes ?? 0;
    } else {
      // No matching portal_plans row — shouldn't happen if plans were created via
      // portal-billing create-plan, but we fall back to price.unit_amount for display.
      priceMonthly = firstItem?.price?.unit_amount != null
        ? firstItem.price.unit_amount / 100
        : null;
      planName = "(unknown plan)";
    }
  }

  // Stripe 2024-06-20 exposes current_period_* on the subscription object directly.
  // Newer API versions moved them onto the subscription item. Prefer the item if present.
  // deno-lint-ignore no-explicit-any
  const subAny = sub as any;
  const currentPeriodStart = firstItem && (firstItem as unknown as { current_period_start?: number }).current_period_start
    ? (firstItem as unknown as { current_period_start: number }).current_period_start
    : subAny.current_period_start ?? null;
  const currentPeriodEnd = firstItem && (firstItem as unknown as { current_period_end?: number }).current_period_end
    ? (firstItem as unknown as { current_period_end: number }).current_period_end
    : subAny.current_period_end ?? null;

  const { error: upsertErr } = await supabase
    .from("portal_subscriptions")
    .upsert(
      {
        org_id: org.id,
        plan_id: planId,
        stripe_subscription_id: sub.id,
        plan_name: planName,
        price_monthly: priceMonthly,
        call_minutes_limit: includedMinutes,
        status: sub.status,
        current_period_start: tsFromUnix(currentPeriodStart),
        current_period_end: tsFromUnix(currentPeriodEnd),
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (upsertErr) throw new Error(`Subscription upsert failed: ${upsertErr.message}`);
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getServiceClient>,
  sub: Stripe.Subscription,
) {
  const { error } = await supabase
    .from("portal_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) throw new Error(`Subscription cancel failed: ${error.message}`);
}

async function handleInvoiceUpsert(
  supabase: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice,
  eventType: string,
) {
  if (!invoice.id) {
    console.warn("[portal-webhook] Invoice without ID — skipping");
    return;
  }

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id ?? null;
  if (!customerId) {
    console.warn("[portal-webhook] Invoice without customer — skipping", invoice.id);
    return;
  }

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!org) {
    console.warn("[portal-webhook] No org for invoice customer:", customerId);
    return;
  }

  // deno-lint-ignore no-explicit-any
  const invAny = invoice as any;
  const subId = typeof invAny.subscription === "string"
    ? invAny.subscription
    : invAny.subscription?.id ?? null;

  const statusOverride =
    eventType === "invoice.payment_failed"
      ? "payment_failed"
      : invoice.status ?? "open";

  const { error: upsertErr } = await supabase
    .from("portal_invoices")
    .upsert(
      {
        id: invoice.id,
        org_id: org.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subId,
        status: statusOverride,
        currency: invoice.currency ?? "usd",
        amount_due: (invoice.amount_due ?? 0) / 100,
        amount_paid: (invoice.amount_paid ?? 0) / 100,
        amount_remaining: (invoice.amount_remaining ?? 0) / 100,
        created_at_stripe: tsFromUnix(invoice.created),
        due_date: tsFromUnix(invoice.due_date),
        period_start: tsFromUnix(invoice.period_start),
        period_end: tsFromUnix(invoice.period_end),
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf: invoice.invoice_pdf ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (upsertErr) throw new Error(`Invoice upsert failed: ${upsertErr.message}`);

  // If payment failed, mark the parent subscription past_due
  if (eventType === "invoice.payment_failed" && subId) {
    await supabase
      .from("portal_subscriptions")
      .update({ status: "past_due" })
      .eq("stripe_subscription_id", subId);
  }
}

async function handleCustomerUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  customer: Stripe.Customer,
) {
  const updates: Record<string, string | null> = {};
  if (customer.email !== undefined) updates.billing_email = customer.email ?? null;
  if (customer.name !== undefined) updates.name = customer.name ?? null;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("portal_organizations")
    .update(updates)
    .eq("stripe_customer_id", customer.id);

  if (error) throw new Error(`Customer update failed: ${error.message}`);
}
