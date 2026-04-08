import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orgId, minutes } = body;

  if (!orgId || !minutes) {
    return NextResponse.json({ error: "Missing orgId or minutes" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const incrementBy = Math.ceil(minutes);

  const { data: sub } = await supabase
    .from("portal_subscriptions")
    .select("id, call_minutes_used")
    .eq("org_id", orgId)
    .eq("status", "active")
    .single();

  if (!sub) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  await supabase
    .from("portal_subscriptions")
    .update({ call_minutes_used: sub.call_minutes_used + incrementBy })
    .eq("id", sub.id);

  return NextResponse.json({ ok: true, used: sub.call_minutes_used + incrementBy });
}
