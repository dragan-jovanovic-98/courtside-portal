// portal-tool-send-caller-sms-callback-confirmation
//
// Tool endpoint the Retell agent calls to send the caller an SMS confirming the
// callback time/details. Sends via Twilio. If commitment_id is provided, appends
// the delivery to portal_commitments.delivery_log.
//
// Auth: x-tool-secret header.
// verify_jwt: false.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  errorResponse,
  getServiceClient,
  hasToolSecret,
  jsonResponse,
} from "../_shared/auth.ts";
import { sendSms } from "../_shared/twilio.ts";

interface SendCallbackSmsBody {
  retell_call_id: string;
  retell_agent_id: string;
  caller_phone: string;
  /** Required. The Twilio number to send FROM. Configured per agent in Retell — typically the
   * brokerage's Court-Side-provisioned inbound number (so the caller sees the same number they
   * just dialed) or a brokerage-owned outbound number. NOT a global env-var default. */
  from_number: string;
  message_body: string;
  commitment_id?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!hasToolSecret(req)) return errorResponse("Invalid tool secret", 401);

  let body: SendCallbackSmsBody;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  if (!body.retell_call_id || !body.retell_agent_id || !body.caller_phone || !body.from_number || !body.message_body) {
    return errorResponse("Missing required fields: retell_call_id, retell_agent_id, caller_phone, from_number, message_body");
  }

  const supabase = getServiceClient();

  // Validate the agent is registered (light auth check beyond the tool secret)
  const { data: agent } = await supabase
    .from("portal_agents")
    .select("id, org_id")
    .eq("retell_agent_id", body.retell_agent_id)
    .maybeSingle();
  if (!agent) return errorResponse(`Unknown agent: ${body.retell_agent_id}`, 404);

  let smsResult;
  try {
    smsResult = await sendSms({ to: body.caller_phone, body: body.message_body, fromNumber: body.from_number });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send_caller_sms_callback_confirmation] Twilio error:", message);
    return errorResponse(`SMS delivery failed: ${message}`, 502);
  }

  // Append to commitment delivery log if linked
  if (body.commitment_id) {
    const { data: commitment } = await supabase
      .from("portal_commitments")
      .select("delivery_log")
      .eq("id", body.commitment_id)
      .maybeSingle();
    if (commitment) {
      const newEntry = {
        channel: "sms_to_caller",
        status: "sent",
        recipient: body.caller_phone,
        attempted_at: new Date().toISOString(),
        message_id: smsResult.sid,
      };
      const updatedLog = Array.isArray(commitment.delivery_log)
        ? [...commitment.delivery_log, newEntry]
        : [newEntry];
      await supabase
        .from("portal_commitments")
        .update({ delivery_log: updatedLog })
        .eq("id", body.commitment_id);
    }
  }

  return jsonResponse({ ok: true, sid: smsResult.sid });
});
