import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const orgId = searchParams.get("state");

  if (!code || !orgId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_params", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const supabase = createAdminClient();

    // Get user email from Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const userInfo = await userInfoRes.json();

    await supabase.from("portal_integrations").upsert(
      {
        org_id: orgId,
        service_name: "google_calendar",
        service_type: "calendar",
        status: "connected",
        config: tokens,
        account_email: userInfo.email,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "org_id,service_name" as never }
    );

    return NextResponse.redirect(
      new URL("/settings/integrations?success=calendar_connected", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=auth_failed", request.url)
    );
  }
}
