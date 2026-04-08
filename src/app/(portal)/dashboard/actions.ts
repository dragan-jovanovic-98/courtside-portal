"use server";

import { createClient } from "@/lib/supabase/server";
import { getHourInTz } from "@/lib/date";
import type { KpiData } from "@/components/dashboard/kpi-cards";

interface DashboardFilters {
  orgId: string;
  from: string;
  to: string;
}

export async function getDashboardKpis(
  filters: DashboardFilters
): Promise<KpiData> {
  const supabase = await createClient();

  // Current period calls
  const { data: calls } = await supabase
    .from("portal_calls")
    .select("id, status, duration_seconds, outcome_category_id, started_at")
    .eq("org_id", filters.orgId)
    .gte("started_at", filters.from)
    .lte("started_at", filters.to);

  // Get org info
  const { data: org } = await supabase
    .from("portal_organizations")
    .select("conversion_metric_label, average_order_value")
    .eq("id", filters.orgId)
    .single();

  // Get outcome categories
  const { data: outcomes } = await supabase
    .from("portal_outcome_categories")
    .select("id, close_likelihood")
    .eq("org_id", filters.orgId);

  const outcomeMap = new Map(outcomes?.map((o) => [o.id, o]) || []);

  const totalCalls = calls?.length || 0;
  const callsHandled = calls?.filter((c) => c.status === "completed").length || 0;
  const totalSeconds = calls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
  const minutesTalked = totalSeconds / 60;
  const avgDuration = totalCalls > 0 ? totalSeconds / totalCalls : 0;

  let conversions = 0;
  const avgOrderValue = org?.average_order_value || 0;

  for (const call of calls || []) {
    if (!call.outcome_category_id) continue;
    const outcome = outcomeMap.get(call.outcome_category_id);
    if (!outcome) continue;
    conversions += outcome.close_likelihood / 100;
  }

  const revenueImpact = conversions * avgOrderValue;

  // Calculate previous period for trends
  const fromDate = new Date(filters.from);
  const toDate = new Date(filters.to);
  const periodMs = toDate.getTime() - fromDate.getTime();
  const prevFrom = new Date(fromDate.getTime() - periodMs).toISOString();
  const prevTo = filters.from;

  const { data: prevCalls } = await supabase
    .from("portal_calls")
    .select("id, status, duration_seconds, outcome_category_id")
    .eq("org_id", filters.orgId)
    .gte("started_at", prevFrom)
    .lt("started_at", prevTo);

  const prevTotal = prevCalls?.length || 0;
  const prevHandled = prevCalls?.filter((c) => c.status === "completed").length || 0;
  const prevSeconds = prevCalls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
  const prevMinutes = prevSeconds / 60;
  const prevAvgDuration = prevTotal > 0 ? prevSeconds / prevTotal : 0;

  let prevConversions = 0;
  for (const call of prevCalls || []) {
    if (!call.outcome_category_id) continue;
    const outcome = outcomeMap.get(call.outcome_category_id);
    if (!outcome) continue;
    prevConversions += outcome.close_likelihood / 100;
  }
  const prevRevenue = prevConversions * avgOrderValue;

  // Only show trends when the previous period had data.
  // Without a previous baseline, percentage changes are meaningless.
  const hasPreviousData = prevTotal > 0;

  function trend(current: number, prev: number): number | null {
    if (!hasPreviousData) return null;
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  }

  return {
    totalCalls: callsHandled,
    minutesTalked,
    avgDuration,
    conversions,
    conversionLabel: org?.conversion_metric_label || "Est. Orders",
    revenueImpact,
    avgOrderValueConfigured: avgOrderValue > 0,
    hasPreviousData,
    trends: {
      totalCalls: trend(callsHandled, prevHandled),
      minutesTalked: trend(minutesTalked, prevMinutes),
      avgDuration: trend(avgDuration, prevAvgDuration),
      conversions: trend(conversions, prevConversions),
      revenueImpact: trend(revenueImpact, prevRevenue),
    },
  };
}

export interface OutcomeChartData {
  id: string;
  name: string;
  count: number;
  impactTier: string;
  color: string | null;
  estimatedValue: number;
}

export interface HoursChartData {
  businessHours: number;
  afterHours: number;
  total: number;
}

export interface VolumeByHourData {
  hour: number;
  count: number;
}

export interface VolumeByDayData {
  day: string;
  count: number;
}

export async function getDashboardCharts(filters: DashboardFilters) {
  const supabase = await createClient();

  const { data: calls } = await supabase
    .from("portal_calls")
    .select("id, outcome_category_id, is_after_hours, started_at, duration_seconds")
    .eq("org_id", filters.orgId)
    .gte("started_at", filters.from)
    .lte("started_at", filters.to);

  const { data: outcomes } = await supabase
    .from("portal_outcome_categories")
    .select("id, name, impact_tier, color, close_likelihood")
    .eq("org_id", filters.orgId)
    .order("sort_order");

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("average_order_value, timezone")
    .eq("id", filters.orgId)
    .single();

  const avgOrderValue = org?.average_order_value || 0;

  // Outcome chart data
  const outcomeCounts = new Map<string, number>();
  for (const call of calls || []) {
    if (call.outcome_category_id) {
      outcomeCounts.set(
        call.outcome_category_id,
        (outcomeCounts.get(call.outcome_category_id) || 0) + 1
      );
    }
  }

  const outcomeChartData: OutcomeChartData[] = (outcomes || []).map((o) => ({
    id: o.id,
    name: o.name,
    count: outcomeCounts.get(o.id) || 0,
    impactTier: o.impact_tier,
    color: o.color,
    estimatedValue: (outcomeCounts.get(o.id) || 0) * avgOrderValue * (o.close_likelihood / 100),
  })).filter((d) => d.count > 0);

  // Hours pie data
  const businessHours = calls?.filter((c) => !c.is_after_hours).length || 0;
  const afterHours = calls?.filter((c) => c.is_after_hours).length || 0;
  const hoursData: HoursChartData = {
    businessHours,
    afterHours,
    total: businessHours + afterHours,
  };

  const orgTz = org?.timezone || "America/New_York";

  // Volume by hour (in org timezone)
  const hourCounts = new Array(24).fill(0);
  for (const call of calls || []) {
    const hour = getHourInTz(call.started_at, orgTz);
    hourCounts[hour]++;
  }
  const volumeByHour: VolumeByHourData[] = hourCounts.map((count, hour) => ({
    hour,
    count,
  }));

  // Volume by day of week (in org timezone)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts = new Array(7).fill(0);
  for (const call of calls || []) {
    const dayIndex = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: orgTz,
    }).format(new Date(call.started_at));
    const idx = dayNames.indexOf(dayIndex);
    if (idx !== -1) dayCounts[idx]++;
  }
  const volumeByDay: VolumeByDayData[] = dayCounts.map((count, i) => ({
    day: dayNames[i],
    count,
  }));

  return {
    outcomeChartData,
    hoursData,
    volumeByHour,
    volumeByDay,
  };
}
