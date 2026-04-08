import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, createCustomer } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await request.json();

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("id, name, stripe_customer_id, primary_email")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await createCustomer(
      org.primary_email || user.email || "",
      org.name,
      org.id
    );
    customerId = customer.id;
    await supabase
      .from("portal_organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
