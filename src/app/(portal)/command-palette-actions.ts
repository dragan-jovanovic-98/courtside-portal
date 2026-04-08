"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchCalls(orgId: string, query: string) {
  const supabase = await createClient();
  const pattern = `%${query}%`;

  const { data } = await supabase
    .from("portal_calls")
    .select("id, caller_name, caller_number, summary_one_line, started_at")
    .eq("org_id", orgId)
    .or(
      `caller_name.ilike.${pattern},caller_number.ilike.${pattern},summary_one_line.ilike.${pattern}`
    )
    .order("started_at", { ascending: false })
    .limit(5);

  return data || [];
}

export async function searchBookings(orgId: string, query: string) {
  const supabase = await createClient();
  const pattern = `%${query}%`;

  const { data } = await supabase
    .from("portal_bookings")
    .select("id, title, service_type, scheduled_at")
    .eq("org_id", orgId)
    .or(
      `title.ilike.${pattern},service_type.ilike.${pattern}`
    )
    .order("scheduled_at", { ascending: false })
    .limit(5);

  return data || [];
}
