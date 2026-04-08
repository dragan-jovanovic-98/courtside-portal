import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const supabase = await createClient();

  // Handle code exchange (OAuth / magic link style)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Handle token hash (email invite / confirmation style)
  if (tokenHash && type) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "email" | "signup" | "magiclink" | "recovery",
    });
  }

  // Check if the user is now authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl));
  }

  // Handle password recovery — redirect to reset page
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", siteUrl));
  }

  // Check if user has invite metadata
  const inviteId = user.user_metadata?.invite_id;
  const orgId = user.user_metadata?.org_id;

  if (inviteId && orgId) {
    // This is an invited user — check if they already have a portal_users record
    // (in case they click the link again after accepting)
    const { data: existingUser } = await supabase
      .from("portal_users")
      .select("id")
      .eq("auth_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (existingUser) {
      // Already accepted — go to dashboard
      return NextResponse.redirect(new URL("/dashboard", siteUrl));
    }

    // Redirect to accept-invite page to complete their profile
    return NextResponse.redirect(
      new URL(`/accept-invite?invite_id=${inviteId}`, siteUrl)
    );
  }

  // Non-invite auth (e.g., password recovery) — check if they have a portal_users record
  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("id")
    .eq("auth_id", user.id)
    .limit(1)
    .maybeSingle();

  if (portalUser) {
    return NextResponse.redirect(new URL("/dashboard", siteUrl));
  }

  // No portal user record — send to signup to create org
  return NextResponse.redirect(new URL("/signup", siteUrl));
}
