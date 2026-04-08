import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("org_id")
    .eq("auth_id", user.id)
    .limit(1)
    .single();

  if (!portalUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = portalUser.org_id;
  const params = request.nextUrl.searchParams;

  let query = supabase
    .from("portal_calls")
    .select(
      "id, direction, status, caller_name, caller_number, started_at, duration_seconds, is_after_hours, sentiment, summary_one_line, agent:portal_agents(name), outcome_category:portal_outcome_categories(name)"
    )
    .eq("org_id", orgId);

  const direction = params.get("direction");
  if (direction && direction !== "all") {
    query = query.in("direction", direction.split(","));
  }

  const sentiment = params.get("sentiment");
  if (sentiment && sentiment !== "all") {
    query = query.in("sentiment", sentiment.split(","));
  }

  const agentId = params.get("agent");
  if (agentId && agentId !== "all") {
    query = query.in("agent_id", agentId.split(","));
  }

  const outcomeId = params.get("outcome");
  if (outcomeId && outcomeId !== "all") {
    query = query.in("outcome_category_id", outcomeId.split(","));
  }

  const hours = params.get("hours");
  if (hours === "business") {
    query = query.eq("is_after_hours", false);
  } else if (hours === "after") {
    query = query.eq("is_after_hours", true);
  }

  const search = params.get("search");
  if (search) {
    query = query.textSearch("search_vector", search, { type: "websearch" });
  }

  query = query.order("started_at", { ascending: false }).limit(5000);

  const { data: calls } = await query;

  const headers = [
    "Call ID",
    "Date",
    "Direction",
    "Status",
    "Caller Name",
    "Caller Number",
    "Agent",
    "Outcome",
    "Duration",
    "Sentiment",
    "Hours",
    "Summary",
  ];

  const rows = (calls || []).map((call: Record<string, unknown>) => {
    const agent = call.agent as { name: string } | null;
    const outcome = call.outcome_category as { name: string } | null;

    return [
      call.id as string,
      new Date(call.started_at as string).toISOString(),
      call.direction as string,
      call.status as string,
      (call.caller_name as string) || "",
      (call.caller_number as string) || "",
      agent?.name || "",
      outcome?.name || "",
      formatDuration(call.duration_seconds as number | null),
      (call.sentiment as string) || "",
      (call.is_after_hours as boolean) ? "After hours" : "Business hours",
      (call.summary_one_line as string) || "",
    ].map((v) => escapeCsv(String(v)));
  });

  const csv = [headers.map((h) => escapeCsv(h)).join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="call-logs-${date}.csv"`,
    },
  });
}
