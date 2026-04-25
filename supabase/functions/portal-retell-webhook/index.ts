// portal-retell-webhook
//
// Receives Retell call_analyzed events. Verifies x-retell-signature, idempotency-logs to
// portal_retell_event_log (PK = call_id; ON CONFLICT DO NOTHING + processed_at short-circuit),
// resolves agent → org_id, INSERTs portal_calls with the full Retell payload (transcript,
// tool_calls, costs, latency, recording URLs, baseline call_analysis), reconciles any
// portal_commitments rows that were created during the call by tool endpoints (linking
// call_id via retell_call_id), then invokes the post-call analyzer (function name from
// portal_agents.analysis_function_name; defaults to portal-post-call-analysis).
//
// verify_jwt: false. Custom auth via Retell signature verification.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  getServiceClient,
  jsonResponse,
} from "../_shared/auth.ts";
import {
  RetellWebhookEnvelope,
  verifyRetellSignature,
} from "../_shared/retell.ts";

// Map Retell disconnection_reason → portal_call_status enum
function mapCallStatus(disconnectionReason?: string | null): string {
  if (!disconnectionReason) return "completed";
  const r = disconnectionReason.toLowerCase();
  if (r.includes("voicemail")) return "voicemail";
  if (r.includes("transfer")) return "transferred";
  if (r.includes("no_answer") || r.includes("dial_no_answer")) return "missed";
  if (r.includes("abandoned")) return "abandoned";
  return "completed";
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-retell-signature");
  const webhookSecret = Deno.env.get("RETELL_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("[portal-retell-webhook] RETELL_WEBHOOK_SECRET is not set");
    return errorResponse("Server misconfigured", 500);
  }

  const sigValid = await verifyRetellSignature(rawBody, signatureHeader, webhookSecret);
  if (!sigValid) {
    console.warn("[portal-retell-webhook] Invalid signature");
    return errorResponse("Invalid signature", 401);
  }

  let envelope: RetellWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return errorResponse("Invalid JSON body");
  }

  // V1 only handles call_analyzed. Other events (call_started, call_ended) are acknowledged.
  if (envelope.event !== "call_analyzed") {
    return jsonResponse({ received: true, skipped: true, reason: `Event ${envelope.event} not handled in V1` });
  }

  const call = envelope.call;
  if (!call?.call_id || !call.agent_id) {
    return errorResponse("Missing call_id or agent_id in payload");
  }

  const supabase = getServiceClient();

  // Idempotency: insert event log row, ignore conflicts.
  const { error: logInsertErr } = await supabase
    .from("portal_retell_event_log")
    .insert({
      id: call.call_id,
      event_type: envelope.event,
      payload: envelope,
    });

  // Treat unique-violation errors as "already received" — non-violation errors are real failures.
  if (logInsertErr && logInsertErr.code !== "23505") {
    console.error("[portal-retell-webhook] Failed to insert event log:", logInsertErr);
    return errorResponse(`Failed to log event: ${logInsertErr.message}`, 500);
  }

  // Check processed_at to short-circuit duplicates that already finished processing.
  const { data: existingEvent } = await supabase
    .from("portal_retell_event_log")
    .select("processed_at")
    .eq("id", call.call_id)
    .maybeSingle();

  if (existingEvent?.processed_at) {
    return jsonResponse({ received: true, duplicate: true });
  }

  // Resolve org_id from the agent registration.
  const { data: agent } = await supabase
    .from("portal_agents")
    .select("id, org_id, analysis_function_name, recording_disclosure_id")
    .eq("retell_agent_id", call.agent_id)
    .maybeSingle();

  if (!agent) {
    const errorMsg = `No portal_agents row for retell_agent_id=${call.agent_id}`;
    console.error(`[portal-retell-webhook] ${errorMsg}`);
    await supabase
      .from("portal_retell_event_log")
      .update({ error: errorMsg, processed_at: new Date().toISOString() })
      .eq("id", call.call_id);
    return jsonResponse({ received: true, error: errorMsg });
  }

  // Resolve recording disclosure: agent-specific override → org default → null
  let recordingDisclosureId: string | null = agent.recording_disclosure_id ?? null;
  if (!recordingDisclosureId) {
    const { data: org } = await supabase
      .from("portal_organizations")
      .select("default_recording_disclosure_id")
      .eq("id", agent.org_id)
      .maybeSingle();
    recordingDisclosureId = org?.default_recording_disclosure_id ?? null;
  }

  // Short-circuit very short calls (< 30s typically a hangup or test).
  const durationSeconds = Math.round(call.duration_ms / 1000);
  const analysisStatus = call.duration_ms < 30000 ? "skipped" : "pending";

  const callRow = {
    org_id: agent.org_id,
    agent_id: agent.id,
    retell_call_id: call.call_id,
    retell_agent_version: call.agent_version ?? null,
    retell_agent_name: call.agent_name ?? null,
    direction: call.direction,
    status: mapCallStatus(call.disconnection_reason),
    disconnection_reason: call.disconnection_reason ?? null,
    caller_number: call.from_number,
    to_number: call.to_number,
    twilio_call_sid: call.telephony_identifier?.twilio_call_sid ?? null,
    started_at: new Date(call.start_timestamp).toISOString(),
    ended_at: new Date(call.end_timestamp).toISOString(),
    duration_seconds: durationSeconds,
    transcript: call.transcript_object ?? null,
    transcript_text: call.transcript ?? null,
    tool_calls: call.tool_calls ?? null,
    tool_call_count: call.tool_calls?.length ?? 0,
    recording_url: call.recording_url ?? null,
    recording_multi_channel_url: call.recording_multi_channel_url ?? null,
    public_log_url: call.public_log_url ?? null,
    knowledge_base_retrieved_url: call.knowledge_base_retrieved_contents_url ?? null,
    retell_cost_cents: call.call_cost?.combined_cost ?? null,
    retell_cost_breakdown: call.call_cost?.product_costs ?? null,
    latency_metrics: call.latency ?? null,
    latency_avg_ms: call.latency?.e2e?.p50 ? Math.round(call.latency.e2e.p50) : null,
    retell_call_summary: call.call_analysis?.call_summary ?? null,
    retell_user_sentiment: call.call_analysis?.user_sentiment ?? null,
    retell_call_successful: call.call_analysis?.call_successful ?? null,
    retell_in_voicemail: call.call_analysis?.in_voicemail ?? null,
    retell_custom_analysis_data: call.call_analysis?.custom_analysis_data ?? null,
    retell_dynamic_variables: call.retell_llm_dynamic_variables ?? null,
    retell_collected_variables: call.collected_dynamic_variables ?? null,
    metadata: call.llm_token_usage ? { llm_token_usage: call.llm_token_usage } : {},
    analysis_status: analysisStatus,
    recording_disclosure_id: recordingDisclosureId,
  };

  const { data: insertedCall, error: callErr } = await supabase
    .from("portal_calls")
    .insert(callRow)
    .select("id")
    .single();

  if (callErr) {
    const errorMsg = `Failed to insert call: ${callErr.message}`;
    console.error(`[portal-retell-webhook] ${errorMsg}`, callErr);
    await supabase
      .from("portal_retell_event_log")
      .update({ error: errorMsg })
      .eq("id", call.call_id);
    return errorResponse(errorMsg, 500);
  }

  // Reconcile any commitments tools created during the call (linked by retell_call_id).
  const { error: reconcileErr } = await supabase
    .from("portal_commitments")
    .update({ call_id: insertedCall.id })
    .eq("retell_call_id", call.call_id)
    .is("call_id", null);

  if (reconcileErr) {
    console.warn("[portal-retell-webhook] Commitment reconciliation warning:", reconcileErr);
    // Non-fatal — analyzer will retry reconciliation.
  }

  // Mark event processed before invoking the analyzer; the analyzer is idempotent
  // and the cron retry handles failures.
  await supabase
    .from("portal_retell_event_log")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", call.call_id);

  // Invoke analyzer if not skipped. Determined by the agent's analysis_function_name
  // (defaults to portal-post-call-analysis); future per-client variants can set a
  // different name without changing this handler.
  if (analysisStatus === "pending") {
    const analyzerName = agent.analysis_function_name || "portal-post-call-analysis";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const workerSecret = Deno.env.get("WORKER_SECRET")!;
    try {
      const analyzerRes = await fetch(`${supabaseUrl}/functions/v1/${analyzerName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": workerSecret,
        },
        body: JSON.stringify({ action: "analyze", call_id: insertedCall.id }),
      });
      if (!analyzerRes.ok) {
        const text = await analyzerRes.text();
        console.error(
          `[portal-retell-webhook] Analyzer (${analyzerName}) returned ${analyzerRes.status}: ${text}`,
        );
        // Non-fatal — analysis_status remains 'pending' and the retry cron will pick it up.
      }
    } catch (err) {
      console.error("[portal-retell-webhook] Analyzer invocation failed:", err);
      // Non-fatal — retry cron handles it.
    }
  }

  return jsonResponse({ received: true, call_id: insertedCall.id, analysis_status: analysisStatus });
});
