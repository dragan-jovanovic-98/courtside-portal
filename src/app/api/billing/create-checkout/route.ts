import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, createCustomer } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { priceId, orgId } = body;

  if (!priceId || !orgId) {
    return NextResponse.json({ error: "Missing priceId or orgId" }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("id, name, stripe_customer_id, primary_email")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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

  const origin = request.headers.get("origin") || "";
  const session = await createCheckoutSession(
    customerId,
    priceId,
    `${origin}/billing?success=true`,
    `${origin}/billing?canceled=true`
  );

  return NextResponse.json({ url: session.url });
}
