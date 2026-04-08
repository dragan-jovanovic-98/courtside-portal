import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalls } from "./actions";
import { CallsPageContent } from "./calls-page-content";
import type { Agent, OutcomeCategory } from "@/lib/types";

export default async function CallsPage({
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

  const orgId = portalUser.org_id;
  const params = await searchParams;

  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const [callsResult, agentsResult, outcomesResult] = await Promise.all([
    getCalls({
      orgId,
      page: Number(str(params.page)) || 1,
      search: str(params.search),
      direction: str(params.direction),
      status: str(params.status),
      sentiment: str(params.sentiment),
      agentId: str(params.agent),
      outcomeId: str(params.outcome),
      sortBy: str(params.sort),
      sortOrder: str(params.order),
      from: str(params.from),
      to: str(params.to),
      durationMin: str(params.duration_min),
      durationMax: str(params.duration_max),
      hours: str(params.hours),
    }),
    supabase
      .from("portal_agents")
      .select("id, name, agent_type, status")
      .eq("org_id", orgId),
    supabase
      .from("portal_outcome_categories")
      .select("*")
      .eq("org_id", orgId)
      .order("sort_order"),
  ]);

  return (
    <CallsPageContent
      calls={callsResult.calls}
      total={callsResult.total}
      page={callsResult.page}
      perPage={callsResult.perPage}
      agents={(agentsResult.data as Agent[]) || []}
      outcomes={(outcomesResult.data as OutcomeCategory[]) || []}
    />
  );
}
