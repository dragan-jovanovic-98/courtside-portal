import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCustomer(email: string, name: string, orgId: string) {
  return stripe.customers.create({
    email,
    name,
    metadata: { org_id: orgId },
  });
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getInvoices(customerId: string, limit = 10) {
  return stripe.invoices.list({ customer: customerId, limit });
}

export async function reportUsage(
  subscriptionItemId: string,
  quantity: number
) {
  return stripe.billing.meterEvents.create({
    event_name: "call_minutes",
    payload: {
      stripe_customer_id: subscriptionItemId,
      value: quantity.toString(),
    },
  });
}
