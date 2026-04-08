import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingPageContent } from "./billing-content";
import type { Subscription, Invoice } from "@/lib/types";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("org_id, role")
    .eq("auth_id", authUser.id)
    .limit(1)
    .single();
  if (!portalUser) redirect("/login");

  // Only admin, owner, and super_admin can access billing
  if (portalUser.role === "member" || portalUser.role === "viewer") {
    redirect("/dashboard");
  }

  const orgId = portalUser.org_id;

  const [subResult, invoiceResult] = await Promise.all([
    supabase
      .from("portal_subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .single(),
    supabase
      .from("portal_invoices")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at_stripe", { ascending: false })
      .limit(20),
  ]);

  return (
    <BillingPageContent
      subscription={(subResult.data as Subscription) || null}
      invoices={(invoiceResult.data as Invoice[]) || []}
      orgId={orgId}
    />
  );
}
