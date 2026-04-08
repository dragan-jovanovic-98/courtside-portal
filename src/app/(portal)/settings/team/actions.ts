"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function inviteTeamMember(params: {
  email: string;
  role: string;
  orgId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify caller is admin/owner in this org
  const { data: caller } = await admin
    .from("portal_users")
    .select("id, role")
    .eq("auth_id", user.id)
    .eq("org_id", params.orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return { error: "Permission denied" };
  }

  // Check if user is already a member of this org
  const { data: existing } = await admin
    .from("portal_users")
    .select("id")
    .eq("email", params.email)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (existing) {
    return { error: "This person is already a member of your organization" };
  }

  // Check for existing pending invite
  const { data: existingInvite } = await admin
    .from("portal_invitations")
    .select("id")
    .eq("email", params.email)
    .eq("org_id", params.orgId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { error: "An invitation has already been sent to this email" };
  }

  // Create invitation record
  const { data: invitation, error: inviteError } = await admin
    .from("portal_invitations")
    .insert({
      org_id: params.orgId,
      email: params.email,
      role: params.role,
      invited_by: caller.id,
    })
    .select("id")
    .single();

  if (inviteError || !invitation) {
    return { error: "Failed to create invitation" };
  }

  // Get org name for the invite context
  const { data: org } = await admin
    .from("portal_organizations")
    .select("name")
    .eq("id", params.orgId)
    .single();

  // Send Supabase invite email with metadata
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    data: {
      invite_id: invitation.id,
      org_id: params.orgId,
      org_name: org?.name || "the team",
      role: params.role,
    },
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    // Clean up the invitation record if email fails
    await admin.from("portal_invitations").delete().eq("id", invitation.id);
    return { error: error.message };
  }

  return { success: true };
}

export async function cancelInvitation(params: {
  invitationId: string;
  orgId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("portal_users")
    .select("role")
    .eq("auth_id", user.id)
    .eq("org_id", params.orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return { error: "Permission denied" };
  }

  const { error } = await admin
    .from("portal_invitations")
    .delete()
    .eq("id", params.invitationId)
    .eq("org_id", params.orgId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateMemberRole(params: {
  memberId: string;
  newRole: string;
  orgId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("portal_users")
    .select("role")
    .eq("auth_id", user.id)
    .eq("org_id", params.orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return { error: "Permission denied" };
  }

  if (caller.role === "admin") {
    if (params.newRole === "owner") return { error: "Only owners can assign the owner role" };

    const { data: target } = await admin
      .from("portal_users")
      .select("role")
      .eq("id", params.memberId)
      .single();

    if (target?.role === "owner" || target?.role === "admin") {
      return { error: "Admins cannot modify other admins or owners" };
    }
  }

  const { error } = await admin
    .from("portal_users")
    .update({ role: params.newRole })
    .eq("id", params.memberId)
    .eq("org_id", params.orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(params: {
  memberId: string;
  orgId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("portal_users")
    .select("role")
    .eq("auth_id", user.id)
    .eq("org_id", params.orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return { error: "Permission denied" };
  }

  const { data: target } = await admin
    .from("portal_users")
    .select("role")
    .eq("id", params.memberId)
    .single();

  if (target?.role === "owner") {
    return { error: "Cannot remove the organization owner" };
  }

  if (caller.role === "admin" && target?.role === "admin") {
    return { error: "Admins cannot remove other admins" };
  }

  const { error } = await admin
    .from("portal_users")
    .delete()
    .eq("id", params.memberId)
    .eq("org_id", params.orgId);

  if (error) return { error: error.message };
  return { success: true };
}
