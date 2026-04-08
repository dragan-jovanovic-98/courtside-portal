"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomer } from "@/lib/stripe";

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

  // Create organization (admin client bypasses RLS)
  const { data: org, error: orgError } = await supabase
    .from("portal_organizations")
    .insert({
      name: params.orgName,
      slug,
      industry: params.industry,
      business_phone: params.businessPhone,
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: "Failed to create organization: " + orgError.message };
  }

  // Create Stripe customer for this org
  try {
    const customer = await createCustomer(params.email, params.orgName, org.id);
    await supabase
      .from("portal_organizations")
      .update({ stripe_customer_id: customer.id, primary_email: params.email })
      .eq("id", org.id);
  } catch {
    // Non-fatal — Stripe customer can be created later on first billing action
  }

  // Create portal user with owner role
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

  // Seed default outcome categories based on industry
  await supabase.rpc("portal_seed_outcome_categories", {
    p_org_id: org.id,
    p_industry: params.industry,
  });

  // Create compliance settings
  await supabase.from("portal_compliance_settings").insert({ org_id: org.id });

  return { success: true };
}
