import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listEvents, refreshTokenIfNeeded } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const orgId = searchParams.get("orgId");
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!orgId || !timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Get integration
  const { data: integration } = await supabase
    .from("portal_integrations")
    .select("*")
    .eq("org_id", orgId)
    .eq("service_name", "google_calendar")
    .eq("status", "connected")
    .single();

  if (!integration) {
    return NextResponse.json({ events: [], connected: false });
  }

  try {
    const tokens = await refreshTokenIfNeeded(
      integration.config as { access_token: string; refresh_token: string; expires_at: number }
    );

    // Update tokens if refreshed
    if (tokens.access_token !== (integration.config as { access_token: string }).access_token) {
      await supabase
        .from("portal_integrations")
        .update({ config: tokens })
        .eq("id", integration.id);
    }

    const events = await listEvents(
      tokens.access_token,
      "primary",
      timeMin,
      timeMax
    );

    return NextResponse.json({ events, connected: true });
  } catch {
    return NextResponse.json({ events: [], connected: true, error: "sync_failed" });
  }
}
