import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = request.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ methods: [], defaultId: null });
  }

  const methods = await stripe.paymentMethods.list({
    customer: org.stripe_customer_id,
    type: "card",
  });

  const customer = await stripe.customers.retrieve(org.stripe_customer_id);
  const defaultId =
    typeof customer !== "string" && !customer.deleted
      ? (customer.invoice_settings?.default_payment_method as string) || null
      : null;

  return NextResponse.json({
    methods: methods.data.map((m) => ({
      id: m.id,
      brand: m.card?.brand || "unknown",
      last4: m.card?.last4 || "????",
      expMonth: m.card?.exp_month,
      expYear: m.card?.exp_year,
    })),
    defaultId,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { methodId } = await request.json();
  if (!methodId) {
    return NextResponse.json({ error: "Missing methodId" }, { status: 400 });
  }

  await stripe.paymentMethods.detach(methodId);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, methodId } = await request.json();

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account" }, { status: 400 });
  }

  await stripe.customers.update(org.stripe_customer_id, {
    invoice_settings: { default_payment_method: methodId },
  });

  return NextResponse.json({ ok: true });
}
