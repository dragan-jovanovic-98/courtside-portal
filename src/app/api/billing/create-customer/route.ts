import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "@/lib/stripe";

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

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Verify caller is owner or admin of the target org
  const { data: caller } = await supabase
    .from("portal_users")
    .select("role")
    .eq("auth_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin" && caller.role !== "super_admin")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("stripe_customer_id, name, primary_email, billing_email")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Idempotent: return success if already set
  if (org.stripe_customer_id) {
    return NextResponse.json({
      success: true,
      already_exists: true,
      stripe_customer_id: org.stripe_customer_id,
    });
  }

  const email = org.billing_email || org.primary_email || user.email;
  if (!email) {
    return NextResponse.json(
      { error: "No email on file for this organization" },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer(email, org.name, orgId);

    const { error: updateError } = await supabase
      .from("portal_organizations")
      .update({ stripe_customer_id: customer.id })
      .eq("id", orgId);

    if (updateError) {
      return NextResponse.json(
        { error: "Stripe customer created but failed to save: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      already_exists: false,
      stripe_customer_id: customer.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
