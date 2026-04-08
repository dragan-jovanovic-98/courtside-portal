"use server";

import { createClient } from "@/lib/supabase/server";
import type { Call } from "@/lib/types";

interface CallFilters {
  orgId: string;
  page?: number;
  perPage?: number;
  search?: string;
  direction?: string;
  sentiment?: string;
  status?: string;
  agentId?: string;
  outcomeId?: string;
  sortBy?: string;
  sortOrder?: string;
  from?: string;
  to?: string;
  durationMin?: string;
  durationMax?: string;
  hours?: string;
}

export interface CallsResult {
  calls: Call[];
  total: number;
  page: number;
  perPage: number;
}

export async function getCalls(filters: CallFilters): Promise<CallsResult> {
  const supabase = await createClient();
  const page = filters.page || 1;
  const perPage = filters.perPage || 20;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("portal_calls")
    .select(
      "*, agent:portal_agents(id, name), outcome_category:portal_outcome_categories(id, name, impact_tier, close_likelihood)",
      { count: "exact" }
    )
    .eq("org_id", filters.orgId);

  if (filters.search) {
    const term = filters.search.trim();
    const likePattern = `%${term}%`;
    query = query.or(
      `caller_name.ilike.${likePattern},caller_number.ilike.${likePattern},summary_one_line.ilike.${likePattern},ai_summary.ilike.${likePattern},transcript_text.ilike.${likePattern}`
    );
  }

  if (filters.status && filters.status !== "all") {
    const values = filters.status.split(",");
    if (values.length === 1) {
      query = query.eq("status", values[0]);
    } else {
      query = query.in("status", values);
    }
  }

  if (filters.direction && filters.direction !== "all") {
    const values = filters.direction.split(",");
    if (values.length === 1) {
      query = query.eq("direction", values[0]);
    } else {
      query = query.in("direction", values);
    }
  }

  if (filters.sentiment && filters.sentiment !== "all") {
    const values = filters.sentiment.split(",");
    if (values.length === 1) {
      query = query.eq("sentiment", values[0]);
    } else {
      query = query.in("sentiment", values);
    }
  }

  if (filters.agentId && filters.agentId !== "all") {
    const values = filters.agentId.split(",");
    if (values.length === 1) {
      query = query.eq("agent_id", values[0]);
    } else {
      query = query.in("agent_id", values);
    }
  }

  if (filters.outcomeId && filters.outcomeId !== "all") {
    const values = filters.outcomeId.split(",");
    if (values.length === 1) {
      query = query.eq("outcome_category_id", values[0]);
    } else {
      query = query.in("outcome_category_id", values);
    }
  }

  if (filters.hours === "business") {
    query = query.eq("is_after_hours", false);
  } else if (filters.hours === "after") {
    query = query.eq("is_after_hours", true);
  }

  if (filters.durationMin) {
    query = query.gte("duration_seconds", Number(filters.durationMin));
  }

  if (filters.durationMax) {
    query = query.lte("duration_seconds", Number(filters.durationMax));
  }

  if (filters.from) {
    query = query.gte("started_at", filters.from);
  }

  if (filters.to) {
    query = query.lte("started_at", filters.to);
  }

  const sortBy = filters.sortBy || "started_at";
  const sortOrder = filters.sortOrder === "asc";

  query = query
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + perPage - 1);

  const { data, count } = await query;

  return {
    calls: (data as Call[]) || [],
    total: count || 0,
    page,
    perPage,
  };
}

export async function getCallById(callId: string, orgId: string) {
  const supabase = await createClient();

  const { data: call } = await supabase
    .from("portal_calls")
    .select(
      "*, agent:portal_agents(id, name, agent_type), outcome_category:portal_outcome_categories(id, name, impact_tier, close_likelihood), contact:portal_contacts!portal_calls_contact_id_fkey(id, phone_number, first_name, last_name, total_calls)"
    )
    .eq("id", callId)
    .eq("org_id", orgId)
    .single();

  if (!call) return null;

  const { data: actions } = await supabase
    .from("portal_call_actions")
    .select("*")
    .eq("call_id", callId)
    .order("created_at");

  return { ...call, actions: actions || [] } as Call;
}
