import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingsPageContent } from "./bookings-content";
import type { Booking } from "@/lib/types";

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("org_id")
    .eq("auth_id", authUser.id)
    .limit(1)
    .single();
  if (!portalUser) redirect("/login");

  const { data: bookings } = await supabase
    .from("portal_bookings")
    .select("*, agent:portal_agents(id, name)")
    .eq("org_id", portalUser.org_id)
    .order("scheduled_at", { ascending: true });

  return <BookingsPageContent bookings={(bookings as Booking[]) || []} />;
}
