import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CallWebhookPayload {
  agent_id: string;
  org_id: string;
  caller_number: string;
  caller_name: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  transcript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  actions: Array<{
    tool_name: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    duration_ms: number | null;
    error: string | null;
  }>;
  summary: string;
  summary_one_line?: string;
  sentiment: string | null;
  sentiment_score?: number | null;
  engagement_level: string | null;
  outcome_confidence: number | null;
  outcome_category_id?: string | null;
  recording_url?: string | null;
  livekit_room_id?: string;
  latency_avg_ms?: number | null;
}

export async function POST(request: NextRequest) {
  const payload: CallWebhookPayload = await request.json();
  const supabase = createAdminClient();

  // Build transcript text for full-text search
  const transcriptText = (payload.transcript || [])
    .map((e) => `${e.role}: ${e.content}`)
    .join("\n");

  // Insert call record (triggers: calculate_after_hours, update_agent_counters, upsert_contact)
  const { data: call, error: callError } = await supabase
    .from("portal_calls")
    .insert({
      org_id: payload.org_id,
      agent_id: payload.agent_id || null,
      direction: "inbound",
      status: payload.duration_seconds > 0 ? "completed" : "missed",
      outcome_category_id: payload.outcome_category_id || null,
      caller_number: payload.caller_number,
      caller_name: payload.caller_name || null,
      started_at: payload.started_at,
      ended_at: payload.ended_at,
      duration_seconds: payload.duration_seconds,
      sentiment: payload.sentiment,
      sentiment_score: payload.sentiment_score || null,
      engagement_level: payload.engagement_level,
      outcome_confidence: payload.outcome_confidence,
      ai_summary: payload.summary || null,
      summary_one_line: payload.summary_one_line || null,
      transcript: payload.transcript,
      transcript_text: transcriptText,
      recording_url: payload.recording_url || null,
      livekit_room_id: payload.livekit_room_id || null,
      latency_avg_ms: payload.latency_avg_ms || null,
    })
    .select("id")
    .single();

  if (callError) {
    return NextResponse.json(
      { error: "Failed to insert call", details: callError.message },
      { status: 500 }
    );
  }

  // Insert call actions
  if (payload.actions && payload.actions.length > 0) {
    await supabase.from("portal_call_actions").insert(
      payload.actions.map((action) => ({
        call_id: call.id,
        org_id: payload.org_id,
        tool_name: action.tool_name,
        input: action.input,
        output: action.output,
        duration_ms: action.duration_ms,
        error: action.error,
      }))
    );
  }

  // Update subscription usage
  const minutes = Math.ceil(payload.duration_seconds / 60);
  if (minutes > 0) {
    const { data: sub } = await supabase
      .from("portal_subscriptions")
      .select("id, call_minutes_used")
      .eq("org_id", payload.org_id)
      .eq("status", "active")
      .single();

    if (sub) {
      await supabase
        .from("portal_subscriptions")
        .update({ call_minutes_used: sub.call_minutes_used + minutes })
        .eq("id", sub.id);
    }
  }

  return NextResponse.json({ received: true, call_id: call.id });
}
