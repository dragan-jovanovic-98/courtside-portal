import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrgDetail } from "@/components/admin/org-detail";
import type { Organization, Plan, Subscription, Invoice } from "@/lib/types";

export const metadata = {
  title: "Organization — Admin",
};

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [orgResult, plansResult, subsResult, invoicesResult] = await Promise.all([
    admin
      .from("portal_organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("portal_plans")
      .select("*")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("portal_subscriptions")
      .select("*")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("portal_invoices")
      .select("*")
      .eq("org_id", id)
      .order("created_at_stripe", { ascending: false })
      .limit(20),
  ]);

  if (!orgResult.data) notFound();

  return (
    <OrgDetail
      org={orgResult.data as Organization}
      plans={(plansResult.data ?? []) as Plan[]}
      subscriptions={(subsResult.data ?? []) as Subscription[]}
      invoices={(invoicesResult.data ?? []) as Invoice[]}
    />
  );
}
