// portal-tool-send-caller-sms-info
//
// Tool endpoint the Retell agent calls to send the caller a general informational
// SMS (FAQ answer, link, etc.) — NOT linked to a specific commitment.
// Logs the action to portal_call_actions for audit trail (best-effort, by retell_call_id).
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

interface SendInfoSmsBody {
  retell_call_id: string;
  retell_agent_id: string;
  caller_phone: string;
  message_body: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!hasToolSecret(req)) return errorResponse("Invalid tool secret", 401);

  let body: SendInfoSmsBody;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  if (!body.retell_call_id || !body.retell_agent_id || !body.caller_phone || !body.message_body) {
    return errorResponse("Missing required fields: retell_call_id, retell_agent_id, caller_phone, message_body");
  }

  const supabase = getServiceClient();

  const { data: agent } = await supabase
    .from("portal_agents")
    .select("id, org_id")
    .eq("retell_agent_id", body.retell_agent_id)
    .maybeSingle();
  if (!agent) return errorResponse(`Unknown agent: ${body.retell_agent_id}`, 404);

  let smsResult;
  try {
    smsResult = await sendSms({ to: body.caller_phone, body: body.message_body });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send_caller_sms_info] Twilio error:", message);
    return errorResponse(`SMS delivery failed: ${message}`, 502);
  }

  // Best-effort audit log: link to the call by retell_call_id if it already exists.
  // (During an in-progress call, the post-call webhook hasn't fired yet, so call may be NULL.)
  const { data: call } = await supabase
    .from("portal_calls")
    .select("id")
    .eq("retell_call_id", body.retell_call_id)
    .maybeSingle();

  if (call) {
    await supabase
      .from("portal_call_actions")
      .insert({
        call_id: call.id,
        org_id: agent.org_id,
        tool_name: "send_caller_sms_info",
        input: { caller_phone: body.caller_phone, message_body: body.message_body },
        output: { sid: smsResult.sid, status: smsResult.status },
      });
  }

  return jsonResponse({ ok: true, sid: smsResult.sid });
});
