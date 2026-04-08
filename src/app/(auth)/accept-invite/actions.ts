"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function acceptInvite(params: {
  authId: string;
  inviteId: string;
  firstName: string;
  lastName: string | null;
  email: string;
}) {
  const admin = createAdminClient();

  // Get the invitation
  const { data: invitation, error: inviteError } = await admin
    .from("portal_invitations")
    .select("id, org_id, email, role, status, expires_at")
    .eq("id", params.inviteId)
    .single();

  if (inviteError || !invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.status !== "pending") {
    return { error: "This invitation has already been used" };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await admin
      .from("portal_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return { error: "This invitation has expired" };
  }

  // Check email matches
  if (invitation.email.toLowerCase() !== params.email.toLowerCase()) {
    return { error: "This invitation was sent to a different email address" };
  }

  // Check if user already has a portal_users record for this org
  const { data: existing } = await admin
    .from("portal_users")
    .select("id")
    .eq("auth_id", params.authId)
    .eq("org_id", invitation.org_id)
    .maybeSingle();

  if (existing) {
    // Already a member — mark invite as accepted and continue
    await admin
      .from("portal_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);
    return { success: true };
  }

  // Create portal user with the invited role
  const { error: userError } = await admin.from("portal_users").insert({
    auth_id: params.authId,
    org_id: invitation.org_id,
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    role: invitation.role,
  });

  if (userError) {
    return { error: "Failed to create user profile: " + userError.message };
  }

  // Mark invitation as accepted
  await admin
    .from("portal_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { success: true };
}
