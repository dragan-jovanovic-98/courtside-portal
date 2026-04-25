// portal-tool-record-callback
//
// Tool endpoint the Retell agent calls when a caller wants a callback.
// Creates a portal_commitments row with type='callback'. Resolves broker_id via
// (a) explicit broker_hint, (b) caller's assigned_broker_id from prior calls, (c) NULL.
// Fire-and-forgets a notification invocation; the cron retry handles failures.
//
// Auth: x-tool-secret header (RETELL_TOOL_SECRET).
// verify_jwt: false.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  getServiceClient,
  hasToolSecret,
  jsonResponse,
} from "../_shared/auth.ts";

interface RecordCallbackBody {
  retell_call_id: string;
  retell_agent_id: string;
  broker_hint?: string;          // portal_users.id explicitly hinted by the agent
  callback_window_start?: string; // ISO8601
  callback_window_end?: string;   // ISO8601
  scheduled_for?: string;         // ISO8601 — used if a specific time was committed
  contact_name?: string;
  contact_phone: string;
  intake_summary?: string;
  intake_data?: Record<string, unknown>;
  agent_committed_text: string;   // exactly what the agent told the caller
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!hasToolSecret(req)) return errorResponse("Invalid tool secret", 401);

  let body: RecordCallbackBody;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  if (!body.retell_call_id || !body.retell_agent_id || !body.contact_phone || !body.agent_committed_text) {
    return errorResponse("Missing required fields: retell_call_id, retell_agent_id, contact_phone, agent_committed_text");
  }

  const supabase = getServiceClient();

  // Resolve org from agent
  const { data: agent } = await supabase
    .from("portal_agents")
    .select("id, org_id")
    .eq("retell_agent_id", body.retell_agent_id)
    .maybeSingle();
  if (!agent) return errorResponse(`Unknown agent: ${body.retell_agent_id}`, 404);

  // Upsert contact by (org_id, phone_number)
  const nameParts = (body.contact_name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const { data: existingContact } = await supabase
    .from("portal_contacts")
    .select("id, assigned_broker_id, first_name, last_name")
    .eq("org_id", agent.org_id)
    .eq("phone_number", body.contact_phone)
    .maybeSingle();

  let contactId: string;
  let assignedBrokerId: string | null = null;
  if (existingContact) {
    contactId = existingContact.id;
    assignedBrokerId = existingContact.assigned_broker_id;
    // Update name if we have a better one (existing was null)
    if (firstName && !existingContact.first_name) {
      await supabase
        .from("portal_contacts")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", contactId);
    }
  } else {
    const { data: newContact, error: contactErr } = await supabase
      .from("portal_contacts")
      .insert({
        org_id: agent.org_id,
        phone_number: body.contact_phone,
        first_name: firstName,
        last_name: lastName,
        total_calls: 0,
      })
      .select("id")
      .single();
    if (contactErr) return errorResponse(`Failed to upsert contact: ${contactErr.message}`, 500);
    contactId = newContact.id;
  }

  // Resolve broker_id: explicit hint > contact's assigned broker > null
  const brokerId = body.broker_hint || assignedBrokerId || null;

  // Create the commitment
  const { data: commitment, error: commErr } = await supabase
    .from("portal_commitments")
    .insert({
      org_id: agent.org_id,
      retell_call_id: body.retell_call_id,
      broker_id: brokerId,
      contact_id: contactId,
      type: "callback",
      scheduled_for: body.scheduled_for ?? null,
      callback_window_start: body.callback_window_start ?? null,
      callback_window_end: body.callback_window_end ?? null,
      commitment_text: body.agent_committed_text,
      intake_summary: body.intake_summary ?? null,
      intake_data: body.intake_data ?? null,
      status: "pending",
      created_via_tool: "record_callback",
    })
    .select("id")
    .single();

  if (commErr) return errorResponse(`Failed to create commitment: ${commErr.message}`, 500);

  // Fire-and-forget notification (non-blocking; cron retry handles failures)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const workerSecret = Deno.env.get("WORKER_SECRET");
  if (workerSecret) {
    fetch(`${supabaseUrl}/functions/v1/portal-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ action: "notify-broker-of-commitment", commitment_id: commitment.id }),
    }).catch((err) => console.warn("[record_callback] notify dispatch failed:", err));
  }

  return jsonResponse({
    ok: true,
    commitment_id: commitment.id,
    contact_id: contactId,
    broker_id: brokerId,
  });
});
