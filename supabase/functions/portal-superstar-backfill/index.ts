// portal-superstar-backfill
//
// Daily sync from gym_call_logs → portal_calls for Superstar Courts, plus
// inline OpenAI classification of any rows still needing outcome_category_id.
//
// Flow:
//   1. Pre-flight: portal_superstar_sync_status() RPC. If mystery agents exist,
//      halt with 422 — data integrity issue, needs human look.
//   2. Sync: portal_superstar_sync_run(synced_at) RPC. Auto-creates new
//      portal_agents from gym_agents and inserts missing calls atomically.
//   3. Classify: any portal_calls in this org with outcome_category_id NULL
//      and metadata.source like 'gym_pipeline_%' → OpenAI gpt-4.1-mini with
//      strict structured output forces a single category id pick.
//
// Auth: x-worker-secret header.
// verify_jwt: false.
//
// POST body: optional `{ "skip_classification": true }` to do SQL only.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

// Inlined from ../_shared/auth.ts so this function deploys as a single file.
// Mirrors the canonical helpers exactly — keep in sync if those change.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function hasWorkerSecret(req: Request): boolean {
  const expected = Deno.env.get("WORKER_SECRET");
  const provided = req.headers.get("x-worker-secret");
  return !!expected && !!provided && provided === expected;
}

const ORG_ID = "6ba33bb9-2c9b-4418-ba9c-986a76efae3d";
const SOURCE_TAG_PREFIX = "gym_pipeline_";
const OPENAI_MODEL = "gpt-4.1-mini";
const CLASSIFY_CONCURRENCY = 5;
const TRANSCRIPT_CHAR_LIMIT = 8000;

interface SyncStatus {
  gap_size: number;
  mystery_agents: string[];
  new_agents_to_create: Array<{ external_agent_id: string; name: string }>;
}

interface SyncRun {
  agents_created: number;
  calls_inserted: number;
}

interface OutcomeCategory {
  id: string;
  name: string;
  description: string | null;
}

interface PendingCall {
  id: string;
  ai_summary: string | null;
  transcript_text: string | null;
  caller_number: string | null;
}

interface Classification {
  outcome_category_id: string;
  summary_one_line: string;
  confidence_notes: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return errorResponse("Method Not Allowed", 405);

  if (!hasWorkerSecret(req)) {
    return errorResponse("Unauthorized — worker secret required", 401);
  }

  let body: { skip_classification?: boolean } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const startedAt = new Date().toISOString();
  const supabase = getServiceClient();

  // 1. Pre-flight status
  const { data: statusData, error: statusErr } = await supabase.rpc("portal_superstar_sync_status");
  if (statusErr) return errorResponse(`Status RPC failed: ${statusErr.message}`, 500);
  const status = statusData as SyncStatus;

  if (status.mystery_agents.length > 0) {
    return jsonResponse({
      ok: false,
      halted: true,
      reason: "mystery_agents_detected",
      mystery_agents: status.mystery_agents,
      message: `Found ${status.mystery_agents.length} external_agent_id(s) in gym_call_logs that are missing from BOTH gym_agents AND portal_agents. Investigate before syncing.`,
      gap_size: status.gap_size,
      new_agents_to_create: status.new_agents_to_create,
      started_at: startedAt,
    }, 422);
  }

  // 2. Sync
  const { data: runData, error: runErr } = await supabase.rpc("portal_superstar_sync_run", {
    p_synced_at: startedAt,
  });
  if (runErr) return errorResponse(`Sync RPC failed: ${runErr.message}`, 500);
  const run = runData as SyncRun;

  // 3. Classify (unless skipped)
  let classifyReport: {
    attempted: number;
    classified: number;
    failed: number;
    skipped_reason?: string;
    failures?: Array<{ id: string; error: string }>;
  } = { attempted: 0, classified: 0, failed: 0 };

  if (body.skip_classification) {
    classifyReport = { ...classifyReport, skipped_reason: "skip_classification flag in request body" };
  } else {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      classifyReport = { ...classifyReport, skipped_reason: "OPENAI_API_KEY not set in edge function secrets" };
    } else {
      classifyReport = await classifyPending(supabase, openaiKey);
    }
  }

  // 4. Final outcome distribution across all gym-sourced rows
  let distribution: Record<string, number> | null = null;
  try {
    distribution = await computeDistribution(supabase);
  } catch (err) {
    console.warn("Distribution query failed:", err);
  }

  return jsonResponse({
    ok: true,
    halted: false,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    pre_flight: {
      gap_size: status.gap_size,
      new_agents_to_create: status.new_agents_to_create,
    },
    sync: run,
    classification: classifyReport,
    outcome_distribution: distribution,
  });
});

async function classifyPending(
  supabase: ReturnType<typeof getServiceClient>,
  openaiKey: string,
): Promise<{ attempted: number; classified: number; failed: number; failures: Array<{ id: string; error: string }> }> {
  const { data: cats, error: catErr } = await supabase
    .from("portal_outcome_categories")
    .select("id, name, description")
    .eq("org_id", ORG_ID)
    .order("sort_order", { ascending: true });
  if (catErr) throw new Error(`Categories query: ${catErr.message}`);
  const categories = (cats ?? []) as OutcomeCategory[];

  const { data: pending, error: pendErr } = await supabase
    .from("portal_calls")
    .select("id, ai_summary, transcript_text, caller_number, metadata")
    .eq("org_id", ORG_ID)
    .is("outcome_category_id", null)
    .like("metadata->>source", `${SOURCE_TAG_PREFIX}%`);
  if (pendErr) throw new Error(`Pending calls query: ${pendErr.message}`);
  const calls = (pending ?? []) as PendingCall[];

  const report = { attempted: calls.length, classified: 0, failed: 0, failures: [] as Array<{ id: string; error: string }> };
  if (calls.length === 0) return report;

  const queue = [...calls];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const call = queue.shift();
      if (!call) return;
      try {
        const result = await classifyOne(call, categories, openaiKey);
        const { error: upErr } = await supabase
          .from("portal_calls")
          .update({
            outcome_category_id: result.outcome_category_id,
            summary_one_line: result.summary_one_line,
          })
          .eq("id", call.id);
        if (upErr) throw new Error(upErr.message);
        report.classified++;
      } catch (err) {
        report.failed++;
        report.failures.push({ id: call.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CLASSIFY_CONCURRENCY }, () => worker()));
  return report;
}

async function classifyOne(
  call: PendingCall,
  categories: OutcomeCategory[],
  openaiKey: string,
): Promise<Classification> {
  const categoryListText = categories
    .map((c) => `- id: ${c.id} | name: "${c.name}" | description: "${c.description ?? "(none)"}"`)
    .join("\n");

  const transcript = (call.transcript_text ?? "").slice(0, TRANSCRIPT_CHAR_LIMIT);
  const summary = call.ai_summary ?? "(no summary available)";

  const systemPrompt = `You are a post-call classifier for a sports facility ("Superstar Courts" — basketball/volleyball/pickleball/ping-pong courts and related rentals). For each call, pick the single best-fit outcome category from the org's list, and write a short one-line summary. There is always a fit — if uncertain, pick "Other".`;

  const userPrompt = `Per-org outcome categories (pick the single best fit by id):
${categoryListText}

Call summary:
${summary}

Caller phone: ${call.caller_number ?? "(unknown)"}

Transcript:
${transcript || "(no transcript)"}`;

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["outcome_category_id", "summary_one_line", "confidence_notes"],
    properties: {
      outcome_category_id: {
        type: "string",
        enum: categories.map((c) => c.id),
        description: "ID of the single best-fit outcome category. If no good fit, pick the 'Other' category.",
      },
      summary_one_line: {
        type: "string",
        description: "A single-sentence summary of the call, max 80 characters, suitable for a list view.",
      },
      confidence_notes: {
        type: "string",
        description: "Brief notes (1-2 sentences) about ambiguities or low-confidence picks. Keep short.",
      },
    },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "outcome_classification", strict: true, schema },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(json.choices[0].message.content) as Classification;
}

async function computeDistribution(
  supabase: ReturnType<typeof getServiceClient>,
): Promise<Record<string, number>> {
  const [{ data: rows }, { data: cats }] = await Promise.all([
    supabase
      .from("portal_calls")
      .select("outcome_category_id")
      .eq("org_id", ORG_ID)
      .like("metadata->>source", `${SOURCE_TAG_PREFIX}%`),
    supabase
      .from("portal_outcome_categories")
      .select("id, name")
      .eq("org_id", ORG_ID),
  ]);

  const nameById = new Map<string, string>();
  for (const c of (cats ?? []) as Array<{ id: string; name: string }>) nameById.set(c.id, c.name);

  const dist: Record<string, number> = {};
  for (const r of (rows ?? []) as Array<{ outcome_category_id: string | null }>) {
    const key = r.outcome_category_id ? (nameById.get(r.outcome_category_id) ?? r.outcome_category_id) : "(unclassified)";
    dist[key] = (dist[key] ?? 0) + 1;
  }
  return dist;
}
