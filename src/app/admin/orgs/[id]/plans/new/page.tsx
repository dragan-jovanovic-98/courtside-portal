import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanForm } from "@/components/admin/plan-form";
import type { Organization, Plan } from "@/lib/types";

export const metadata = {
  title: "Create plan — Admin",
};

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  // Fetch the target org, plus ALL plans across ALL orgs for the duplicate picker.
  // We also join the org name into each plan so the dropdown can group / label nicely.
  const [orgResult, plansResult, orgsResult] = await Promise.all([
    admin
      .from("portal_organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("portal_plans")
      .select("*")
      .order("created_at", { ascending: false }),
    admin.from("portal_organizations").select("id, name"),
  ]);

  if (!orgResult.data) notFound();

  const orgNameMap = new Map<string, string>();
  for (const o of (orgsResult.data ?? []) as Array<{ id: string; name: string }>) {
    orgNameMap.set(o.id, o.name);
  }

  const existingPlans = ((plansResult.data ?? []) as Plan[]).map((plan) => ({
    ...plan,
    _orgName: plan.org_id ? orgNameMap.get(plan.org_id) ?? "(unknown)" : "Template",
  }));

  return (
    <PlanForm
      org={orgResult.data as Organization}
      existingPlans={existingPlans}
    />
  );
}
