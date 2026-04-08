"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function getIntegrationStatus(orgId: string) {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("portal_integrations")
    .select("id, status, account_email, connected_at")
    .eq("org_id", orgId)
    .eq("service_name", "google_calendar")
    .single();

  return integration
    ? { connected: true, email: integration.account_email, connectedAt: integration.connected_at }
    : { connected: false, email: null, connectedAt: null };
}

export async function getCalendarAuthUrl(orgId: string) {
  return getAuthUrl(orgId);
}

export async function disconnectCalendar(orgId: string) {
  const supabase = await createClient();

  await supabase
    .from("portal_integrations")
    .delete()
    .eq("org_id", orgId)
    .eq("service_name", "google_calendar");
}
