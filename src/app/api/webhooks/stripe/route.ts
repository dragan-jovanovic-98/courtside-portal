import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function getCustomerId(obj: Record<string, unknown>): string | null {
  if (typeof obj.customer === "string") return obj.customer;
  if (obj.customer && typeof (obj.customer as { id: string }).id === "string")
    return (obj.customer as { id: string }).id;
  return null;
}

async function findOrgByCustomer(supabase: ReturnType<typeof createAdminClient>, customerId: string) {
  const { data } = await supabase
    .from("portal_organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription & {
          current_period_start?: number;
          current_period_end?: number;
        };
        const customerId = getCustomerId(subscription as unknown as Record<string, unknown>);
        if (!customerId) break;

        const org = await findOrgByCustomer(supabase, customerId);
        if (!org) {
          console.warn("[Stripe webhook] No org found for customer:", customerId);
          break;
        }

        // Fetch product details for plan metadata
        const firstItem = subscription.items?.data?.[0];
        let planName: string | null = null;
        let priceMonthly: number | null = null;
        let callMinutesLimit = 0;
        let phoneNumbersLimit = 0;

        if (firstItem?.price) {
          priceMonthly = firstItem.price.unit_amount
            ? firstItem.price.unit_amount / 100
            : null;

          // Get product for name and metadata
          const productId = typeof firstItem.price.product === "string"
            ? firstItem.price.product
            : (firstItem.price.product as { id: string })?.id;

          if (productId) {
            try {
              const product = await stripe.products.retrieve(productId);
              planName = product.name;
              callMinutesLimit = parseInt(product.metadata?.call_minutes_limit || "0", 10);
              phoneNumbersLimit = parseInt(product.metadata?.phone_numbers_limit || "0", 10);
            } catch {
              console.warn("[Stripe webhook] Failed to fetch product:", productId);
            }
          }
        }

        await supabase
          .from("portal_subscriptions")
          .upsert(
            {
              org_id: org.id,
              stripe_subscription_id: subscription.id,
              plan_name: planName,
              price_monthly: priceMonthly,
              call_minutes_limit: callMinutesLimit,
              phone_numbers_limit: phoneNumbersLimit,
              status: subscription.status,
              current_period_start: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000).toISOString()
                : null,
              current_period_end: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            },
            { onConflict: "org_id" }
          );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from("portal_subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
        const customerId = getCustomerId(invoice as unknown as Record<string, unknown>);
        if (!customerId) break;

        const org = await findOrgByCustomer(supabase, customerId);
        if (!org) {
          console.warn("[Stripe webhook] No org found for customer:", customerId);
          break;
        }

        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id || null;

        await supabase.from("portal_invoices").upsert({
          id: invoice.id,
          org_id: org.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          status: invoice.status || (event.type === "invoice.paid" ? "paid" : "failed"),
          currency: invoice.currency || "usd",
          amount_due: (invoice.amount_due || 0) / 100,
          amount_paid: (invoice.amount_paid || 0) / 100,
          amount_remaining: (invoice.amount_remaining || 0) / 100,
          created_at_stripe: new Date((invoice.created || 0) * 1000).toISOString(),
          due_date: invoice.due_date
            ? new Date(invoice.due_date * 1000).toISOString()
            : null,
          period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null,
          hosted_invoice_url: invoice.hosted_invoice_url || null,
          invoice_pdf: invoice.invoice_pdf || null,
        });

        // If payment failed, update subscription status
        if (event.type === "invoice.payment_failed" && subId) {
          await supabase
            .from("portal_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }

        break;
      }
    }
  } catch (err) {
    console.error("[Stripe webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
