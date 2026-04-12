import { createAdminClient } from "@/lib/supabase/admin";
import { OrgsTable } from "@/components/admin/orgs-table";
import type { Organization, Subscription } from "@/lib/types";

export const metadata = {
  title: "Organizations — Admin",
};

interface OrgRow {
  org: Organization;
  subscription: Subscription | null;
}

export default async function AdminOrgsPage() {
  const admin = createAdminClient();

  const [orgsResult, subsResult] = await Promise.all([
    admin
      .from("portal_organizations")
      .select("*")
      .order("created_at", { ascending: false }),
    admin
      .from("portal_subscriptions")
      .select("*")
      .in("status", ["active", "trialing", "past_due", "incomplete"]),
  ]);

  const orgs = (orgsResult.data ?? []) as Organization[];
  const subs = (subsResult.data ?? []) as Subscription[];

  const subsByOrg = new Map<string, Subscription>();
  for (const sub of subs) {
    subsByOrg.set(sub.org_id, sub);
  }

  const rows: OrgRow[] = orgs.map((org) => ({
    org,
    subscription: subsByOrg.get(org.id) ?? null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-[#242529]">Organizations</h1>
        <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
          All portal orgs. Click into one to see subscription state and manage plans.
        </p>
      </div>

      <OrgsTable rows={rows} />
    </div>
  );
}
