"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function createOrgAndUser(params: {
  authId: string;
  orgName: string;
  firstName: string;
  lastName: string | null;
  email: string;
  industry: string | null;
  businessPhone: string | null;
}) {
  const supabase = createAdminClient();

  const slug = params.orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create organization (admin client bypasses RLS). The trg_portal_enqueue_stripe_customer_create
  // trigger will queue a Stripe customer creation job — the portal-stripe-customer-worker
  // edge function drains the queue asynchronously.
  const { data: org, error: orgError } = await supabase
    .from("portal_organizations")
    .insert({
      name: params.orgName,
      slug,
      industry: params.industry,
      business_phone: params.businessPhone,
      primary_email: params.email,
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: "Failed to create organization: " + orgError.message };
  }

  const { error: userError } = await supabase.from("portal_users").insert({
    auth_id: params.authId,
    org_id: org.id,
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    role: "owner",
  });

  if (userError) {
    return { error: "Failed to create user profile: " + userError.message };
  }

  await supabase.rpc("portal_seed_outcome_categories", {
    p_org_id: org.id,
    p_industry: params.industry,
  });

  await supabase.from("portal_compliance_settings").insert({ org_id: org.id });

  return { success: true };
}
