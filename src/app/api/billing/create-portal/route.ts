import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orgId } = body;

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found", code: "no_billing_account" },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") || "";
  const session = await createBillingPortalSession(
    org.stripe_customer_id,
    `${origin}/billing`
  );

  return NextResponse.json({ url: session.url });
}
