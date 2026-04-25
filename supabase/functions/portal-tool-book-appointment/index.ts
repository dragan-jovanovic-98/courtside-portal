// portal-tool-book-appointment
//
// Tool endpoint the Retell agent calls when a caller booked a specific appointment time.
// Creates a portal_commitments row with type='appointment' and scheduled_for set.
// Calendar push (when broker has GCal connected) is handled downstream by the
// notifications function on the commitment-broker side; this endpoint just records
// the commitment and triggers notification.
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

interface BookAppointmentBody {
  retell_call_id: string;
  retell_agent_id: string;
  broker_hint?: string;
  appointment_time: string; // ISO8601
  duration_minutes?: number;
  contact_name?: string;
  contact_phone: string;
  intake_summary?: string;
  intake_data?: Record<string, unknown>;
  agent_committed_text: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!hasToolSecret(req)) return errorResponse("Invalid tool secret", 401);

  let body: BookAppointmentBody;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  if (!body.retell_call_id || !body.retell_agent_id || !body.contact_phone || !body.appointment_time || !body.agent_committed_text) {
    return errorResponse("Missing required fields: retell_call_id, retell_agent_id, contact_phone, appointment_time, agent_committed_text");
  }

  // Validate appointment_time parses
  const apptTime = new Date(body.appointment_time);
  if (isNaN(apptTime.getTime())) {
    return errorResponse("appointment_time is not a valid ISO8601 timestamp");
  }

  const supabase = getServiceClient();

  const { data: agent } = await supabase
    .from("portal_agents")
    .select("id, org_id")
    .eq("retell_agent_id", body.retell_agent_id)
    .maybeSingle();
  if (!agent) return errorResponse(`Unknown agent: ${body.retell_agent_id}`, 404);

  // Upsert contact
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

  const brokerId = body.broker_hint || assignedBrokerId || null;

  const intakeData = body.intake_data
    ? { ...body.intake_data, duration_minutes: body.duration_minutes ?? 30 }
    : { duration_minutes: body.duration_minutes ?? 30 };

  const { data: commitment, error: commErr } = await supabase
    .from("portal_commitments")
    .insert({
      org_id: agent.org_id,
      retell_call_id: body.retell_call_id,
      broker_id: brokerId,
      contact_id: contactId,
      type: "appointment",
      scheduled_for: apptTime.toISOString(),
      commitment_text: body.agent_committed_text,
      intake_summary: body.intake_summary ?? null,
      intake_data: intakeData,
      status: "pending",
      created_via_tool: "book_appointment",
    })
    .select("id")
    .single();

  if (commErr) return errorResponse(`Failed to create commitment: ${commErr.message}`, 500);

  // Fire-and-forget notification dispatch
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const workerSecret = Deno.env.get("WORKER_SECRET");
  if (workerSecret) {
    fetch(`${supabaseUrl}/functions/v1/portal-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ action: "notify-broker-of-commitment", commitment_id: commitment.id }),
    }).catch((err) => console.warn("[book_appointment] notify dispatch failed:", err));
  }

  return jsonResponse({
    ok: true,
    commitment_id: commitment.id,
    contact_id: contactId,
    broker_id: brokerId,
    scheduled_for: apptTime.toISOString(),
  });
});
