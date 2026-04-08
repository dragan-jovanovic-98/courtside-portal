import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardKpis, getDashboardCharts } from "./actions";
import { getDateRange } from "@/lib/date-range";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const { data: agents } = await supabase
    .from("portal_agents")
    .select("id, name, status")
    .eq("org_id", portalUser.org_id)
    .eq("status", "active");

  const params = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") urlParams.set(key, value);
  }

  const { from, to } = getDateRange(urlParams);
  const filters = {
    orgId: portalUser.org_id,
    from: from.toISOString(),
    to: to.toISOString(),
  };

  const [kpiData, chartData] = await Promise.all([
    getDashboardKpis(filters),
    getDashboardCharts(filters),
  ]);

  return (
    <DashboardContent
      kpiData={kpiData}
      chartData={chartData}
      activeAgents={agents?.length || 0}
    />
  );
}
