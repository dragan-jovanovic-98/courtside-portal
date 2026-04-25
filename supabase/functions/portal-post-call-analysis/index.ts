// portal-post-call-analysis
//
// Classification + reconciliation analyzer. The agent's tool calls already wrote
// structured outcomes (commitments, SMS log) during the call; this function:
//   1. Reconciles any pending commitments to the call_id (via retell_call_id).
//   2. Asks Claude (sonnet-4-6) to classify intent_type, line_of_business, and
//      pick the best outcome_category from the org's per-org list, plus refined
//      sentiment/summary/caller name. Uses Retell's own call_analysis as a baseline
//      so we don't re-summarize unless needed — saves tokens.
//   3. Updates portal_calls + portal_commitments + logs the attempt for cost
//      observability.
//   4. Triggers brokerage-wide subscriber notifications for the call (per org rule).
//
// Auth: super_admin OR x-worker-secret.
// verify_jwt: false.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  getServiceClient,
  hasWorkerSecret,
  jsonResponse,
  requireSuperAdmin,
} from "../_shared/auth.ts";
import { callClaudeWithStructuredOutput, estimateClaudeCostCents } from "../_shared/anthropic.ts";

const MAX_RETRY_COUNT = 3;

const ANALYZER_SCHEMA = {
  type: "object",
  properties: {
    intent_type: {
      type: "string",
      enum: ["sales", "service", "commercial", "claim", "wrong_number", "other"],
      description: "Primary intent of the caller. 'sales' = new prospect inquiry. 'service' = existing-client question. 'commercial' = commercial-line inquiry. 'claim' = claim notice/inquiry. 'wrong_number' = caller dialed wrong number or it's spam.",
    },
    line_of_business: {
      type: "string",
      enum: ["auto", "home", "life", "health", "commercial", "specialty", "unknown"],
      description: "Insurance line of business the caller is asking about. 'unknown' if the call doesn't make this clear.",
    },
    outcome_category_id: {
      type: ["string", "null"],
      description: "Must be one of the IDs from the provided outcome categories list, or null if no fit. Pick the single best match.",
    },
    refined_sentiment: {
      type: "string",
      enum: ["positive", "neutral", "negative"],
      description: "Refined caller sentiment. Use Retell's user_sentiment as a baseline; only refine if you disagree.",
    },
    refined_summary: {
      type: "string",
      description: "A 2-3 sentence summary of the call. Use Retell's call_summary as the baseline if it's accurate — only refine for accuracy or to add specificity. Do NOT re-write unnecessarily.",
    },
    refined_summary_one_line: {
      type: "string",
      description: "A single-sentence summary, max 80 characters, suitable for a list view.",
    },
    refined_caller_name: {
      type: ["string", "null"],
      description: "The caller's name as they gave it. Reconcile spelled-out names (e.g. 'M-A-I-S-Y' → 'Maisy'). Null if the caller didn't give a name.",
    },
    confidence_notes: {
      type: "string",
      description: "Brief notes (1-2 sentences) about ambiguities, low-confidence picks, or anything notable for review. Keep short.",
    },
  },
  required: [
    "intent_type",
    "line_of_business",
    "refined_sentiment",
    "refined_summary",
    "refined_summary_one_line",
    "confidence_notes",
  ],
};

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Auth: worker secret OR super_admin
  if (!hasWorkerSecret(req)) {
    try { await requireSuperAdmin(req); }
    catch (err) {
      const status = (err as { status?: number })?.status ?? 401;
      const message = (err as { message?: string })?.message ?? "Unauthorized";
      return errorResponse(message, status);
    }
  }

  let body: { action?: string; call_id?: string; force?: boolean };
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  if (body.action === "retry-failed") {
    return await retryFailed();
  }
  if (body.action === "analyze") {
    if (!body.call_id) return errorResponse("Missing call_id");
    return await analyze(body.call_id, body.force ?? false);
  }
  return errorResponse(`Unknown action: ${body.action ?? "(none)"}`);
});

async function retryFailed(): Promise<Response> {
  const supabase = getServiceClient();
  const { data: failedCalls, error } = await supabase
    .from("portal_calls")
    .select("id")
    .eq("analysis_status", "failed")
    .lt("analysis_retry_count", MAX_RETRY_COUNT)
    .order("analysis_attempted_at", { ascending: true })
    .limit(50);

  if (error) return errorResponse(`Failed to query: ${error.message}`, 500);
  if (!failedCalls || failedCalls.length === 0) {
    return jsonResponse({ retried: 0 });
  }

  const results: Array<{ call_id: string; ok: boolean; error?: string }> = [];
  for (const c of failedCalls) {
    try {
      const r = await analyze(c.id, false);
      results.push({ call_id: c.id, ok: r.status === 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ call_id: c.id, ok: false, error: message });
    }
  }
  return jsonResponse({ retried: results.length, results });
}

async function analyze(callId: string, force: boolean): Promise<Response> {
  const supabase = getServiceClient();

  // Load the call with joined agent + org context
  const { data: call, error: loadErr } = await supabase
    .from("portal_calls")
    .select(`
      id, org_id, agent_id, retell_call_id, transcript_text, analysis_status,
      analysis_retry_count, retell_call_summary, retell_user_sentiment,
      tool_calls, caller_name, caller_number,
      agent:portal_agents(id, name, role, intake_schema, recording_disclosure_id),
      org:portal_organizations(id, name, industry, timezone, business_hours)
    `)
    .eq("id", callId)
    .maybeSingle();

  if (loadErr) return errorResponse(`Load failed: ${loadErr.message}`, 500);
  if (!call) return errorResponse(`Call not found: ${callId}`, 404);

  // Idempotency
  if (!force && call.analysis_status === "done") {
    return jsonResponse({ ok: true, skipped: true, reason: "already done" });
  }
  if (call.analysis_status === "skipped") {
    return jsonResponse({ ok: true, skipped: true, reason: "marked skipped" });
  }

  // Mark processing
  await supabase
    .from("portal_calls")
    .update({ analysis_status: "processing", analysis_attempted_at: new Date().toISOString() })
    .eq("id", callId);

  const { data: attempt } = await supabase
    .from("portal_call_analysis_attempts")
    .insert({ call_id: callId, status: "processing", model: "claude-sonnet-4-6" })
    .select("id")
    .single();

  // Reconcile pending commitments by retell_call_id
  if (call.retell_call_id) {
    await supabase
      .from("portal_commitments")
      .update({ call_id: callId })
      .eq("retell_call_id", call.retell_call_id)
      .is("call_id", null);
  }

  // Load org-specific outcome categories
  const { data: categories } = await supabase
    .from("portal_outcome_categories")
    .select("id, name, description, close_likelihood")
    .eq("org_id", call.org_id)
    .order("sort_order", { ascending: true });

  if (!call.transcript_text || call.transcript_text.trim().length < 20) {
    // Nothing meaningful to analyze
    await markFailed(supabase, callId, attempt?.id, "transcript_text empty or too short");
    return errorResponse("Transcript too short to analyze", 422);
  }

  // Build the analyzer prompt
  const orgRecord = (call.org as unknown) as { name?: string; industry?: string | null } | null;
  const agentRecord = (call.agent as unknown) as { name?: string; role?: string; intake_schema?: unknown } | null;

  const orgName = orgRecord?.name ?? "(unknown)";
  const industry = orgRecord?.industry ?? "general";
  const agentName = agentRecord?.name ?? "(unknown)";
  const agentRole = agentRecord?.role ?? "general";
  const intakeSchema = agentRecord?.intake_schema ?? {};

  const categoryListText = (categories ?? [])
    .map((c) => `- id: ${c.id} | name: "${c.name}" | description: "${c.description ?? "(no description)"}"`)
    .join("\n");

  const toolCallsText = Array.isArray(call.tool_calls) && call.tool_calls.length > 0
    ? `Tools the agent called during the call:\n${(call.tool_calls as Array<{ name: string; type?: string }>).map((t, i) => `${i + 1}. ${t.name}${t.type && t.type !== t.name ? ` (${t.type})` : ""}`).join("\n")}`
    : "The agent called no tools during this call.";

  const baselineText = call.retell_call_summary
    ? `Retell's automatic call summary (use as baseline; only refine if inaccurate):\n"${call.retell_call_summary}"\n\nRetell's user sentiment: ${call.retell_user_sentiment ?? "(unknown)"}`
    : "(No Retell baseline summary available.)";

  const systemPrompt = `You are a post-call analyzer for an insurance broker's AI receptionist. Your job is classification + reconciliation, NOT extraction. The agent's tools have already created any commitments (callbacks, appointments, SMS) during the call. You classify the call's intent, line of business, sentiment, and pick the best outcome category from the provided per-org list. You also refine the caller's name if it was misspelled or letter-spelled. Do NOT re-summarize unless Retell's baseline summary is clearly wrong.

Keep your refined_summary close to Retell's baseline if it is accurate. Only refine when:
- Retell got facts wrong
- More specificity would be useful for the broker (e.g. naming the line of business explicitly)
- The summary is clearly missing what the agent committed to

If there is no good fit in the outcome category list, return outcome_category_id: null with a note in confidence_notes explaining why. Do not invent categories.`;

  const userPrompt = `Org: ${orgName} (industry: ${industry})
Agent: ${agentName} (role: ${agentRole})
Agent intake schema: ${JSON.stringify(intakeSchema)}

${baselineText}

${toolCallsText}

Caller raw name (from agent's collected variables, may be misspelled): ${call.caller_name ?? "(none)"}
Caller phone: ${call.caller_number ?? "(none)"}

Per-org outcome categories (pick the single best fit, or null if no fit):
${categoryListText || "(no categories configured for this org)"}

Full transcript:
${call.transcript_text}`;

  let analyzerOutput: Record<string, unknown>;
  let usage: { input_tokens: number; output_tokens: number };
  try {
    const result = await callClaudeWithStructuredOutput({
      system: systemPrompt,
      user: userPrompt,
      schema: ANALYZER_SCHEMA,
    });
    analyzerOutput = result.data as Record<string, unknown>;
    usage = result.usage;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(supabase, callId, attempt?.id, message);
    return errorResponse(`Claude call failed: ${message}`, 502);
  }

  const costCents = estimateClaudeCostCents(usage);

  // Update the call with refined fields. Only overwrite if the analyzer returned a value.
  const callUpdate: Record<string, unknown> = {
    analysis_status: "done",
    analysis_attempted_at: new Date().toISOString(),
    analysis_error: null,
    analysis_cost_cents: costCents,
    analysis_token_usage: { prompt: usage.input_tokens, completion: usage.output_tokens, model: "claude-sonnet-4-6" },
    intent_type: analyzerOutput.intent_type,
    line_of_business: analyzerOutput.line_of_business,
    sentiment: analyzerOutput.refined_sentiment,
    ai_summary: analyzerOutput.refined_summary,
    summary_one_line: analyzerOutput.refined_summary_one_line,
  };
  if (typeof analyzerOutput.outcome_category_id === "string" && analyzerOutput.outcome_category_id) {
    callUpdate.outcome_category_id = analyzerOutput.outcome_category_id;
  }
  if (typeof analyzerOutput.refined_caller_name === "string" && analyzerOutput.refined_caller_name) {
    callUpdate.caller_name = analyzerOutput.refined_caller_name;
  }

  const { error: updateErr } = await supabase
    .from("portal_calls")
    .update(callUpdate)
    .eq("id", callId);

  if (updateErr) {
    await markFailed(supabase, callId, attempt?.id, `Update failed: ${updateErr.message}`);
    return errorResponse(`Failed to update call: ${updateErr.message}`, 500);
  }

  // Mark attempt as done
  if (attempt?.id) {
    await supabase
      .from("portal_call_analysis_attempts")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        prompt_token_count: usage.input_tokens,
        completion_token_count: usage.output_tokens,
      })
      .eq("id", attempt.id);
  }

  // Fire-and-forget org-subscriber notification (per broker_notification_rule).
  // The function checks the rule and fans out to subscribers; idempotent if already sent.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const workerSecret = Deno.env.get("WORKER_SECRET");
  if (workerSecret) {
    fetch(`${supabaseUrl}/functions/v1/portal-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ action: "notify-org-subscribers", call_id: callId }),
    }).catch((err) => console.warn("[analyzer] subscriber-notification dispatch failed:", err));
  }

  return jsonResponse({
    ok: true,
    call_id: callId,
    classification: {
      intent_type: analyzerOutput.intent_type,
      line_of_business: analyzerOutput.line_of_business,
      outcome_category_id: analyzerOutput.outcome_category_id ?? null,
      sentiment: analyzerOutput.refined_sentiment,
    },
    cost_cents: costCents,
    tokens: usage,
  });
}

async function markFailed(
  supabase: ReturnType<typeof getServiceClient>,
  callId: string,
  attemptId: string | undefined,
  errorMsg: string,
): Promise<void> {
  await supabase
    .from("portal_calls")
    .update({
      analysis_status: "failed",
      analysis_attempted_at: new Date().toISOString(),
      analysis_error: errorMsg.slice(0, 500),
      analysis_retry_count: (await getRetryCount(supabase, callId)) + 1,
    })
    .eq("id", callId);
  if (attemptId) {
    await supabase
      .from("portal_call_analysis_attempts")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: errorMsg.slice(0, 1000),
      })
      .eq("id", attemptId);
  }
}

async function getRetryCount(
  supabase: ReturnType<typeof getServiceClient>,
  callId: string,
): Promise<number> {
  const { data } = await supabase
    .from("portal_calls")
    .select("analysis_retry_count")
    .eq("id", callId)
    .maybeSingle();
  return data?.analysis_retry_count ?? 0;
}
