// portal-notifications
//
// SendGrid broker email delivery for commitments + brokerage-wide subscribers.
// Twilio SMS to brokers is reserved for later (commitment_sms preference exists
// but is disabled in V1 UI).
//
// Actions:
//   - notify-broker-of-commitment ({ commitment_id })  : sends to assigned broker per their preferences
//   - notify-org-subscribers      ({ call_id })        : fans out per org's broker_notification_rule
//   - retry-undelivered           ()                   : worker-secret only, called by cron
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
import { sendEmail } from "../_shared/sendgrid.ts";
import { renderBrokerCommitmentEmail } from "./email-templates.ts";

interface DeliveryLogEntry {
  channel: string;
  status: string;
  recipient?: string;
  reason?: string;
  attempted_at: string;
  message_id?: string;
  error?: string;
}

const RETRY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!hasWorkerSecret(req)) {
    try { await requireSuperAdmin(req); }
    catch (err) {
      const status = (err as { status?: number })?.status ?? 401;
      const message = (err as { message?: string })?.message ?? "Unauthorized";
      return errorResponse(message, status);
    }
  }

  let body: { action?: string; commitment_id?: string; call_id?: string };
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }

  switch (body.action) {
    case "notify-broker-of-commitment":
      if (!body.commitment_id) return errorResponse("Missing commitment_id");
      return await notifyBrokerOfCommitment(body.commitment_id);
    case "notify-org-subscribers":
      if (!body.call_id) return errorResponse("Missing call_id");
      return await notifyOrgSubscribers(body.call_id);
    case "retry-undelivered":
      return await retryUndelivered();
    default:
      return errorResponse(`Unknown action: ${body.action ?? "(none)"}`);
  }
});

async function notifyBrokerOfCommitment(commitmentId: string): Promise<Response> {
  const supabase = getServiceClient();

  const { data: commitment, error: loadErr } = await supabase
    .from("portal_commitments")
    .select(`
      id, org_id, call_id, broker_id, contact_id, type, scheduled_for,
      callback_window_start, callback_window_end, commitment_text,
      intake_summary, status, delivery_log,
      org:portal_organizations(id, name)
    `)
    .eq("id", commitmentId)
    .maybeSingle();

  if (loadErr) return errorResponse(`Load failed: ${loadErr.message}`, 500);
  if (!commitment) return errorResponse(`Commitment not found: ${commitmentId}`, 404);

  if (!commitment.broker_id) {
    // No assigned broker — skip per-broker notification; org subscribers handle this case.
    return jsonResponse({ ok: true, skipped: true, reason: "no broker_id" });
  }

  // Idempotency: skip if a successful email was already sent.
  const log = (commitment.delivery_log as DeliveryLogEntry[] | null) ?? [];
  const alreadySentEmail = log.some((e) => e.channel === "email" && (e.status === "success" || e.status === "sent"));
  if (alreadySentEmail) {
    return jsonResponse({ ok: true, skipped: true, reason: "email already delivered" });
  }

  // Load broker + their notification preferences
  const { data: broker } = await supabase
    .from("portal_users")
    .select("id, email, first_name, last_name")
    .eq("id", commitment.broker_id)
    .maybeSingle();
  if (!broker?.email) {
    return await appendDeliveryLog(supabase, commitmentId, log, {
      channel: "email",
      status: "skipped",
      reason: "broker has no email",
      attempted_at: new Date().toISOString(),
    });
  }

  const { data: prefRow } = await supabase
    .from("portal_notification_preferences")
    .select("preferences")
    .eq("user_id", commitment.broker_id)
    .maybeSingle();
  const prefs = (prefRow?.preferences ?? {}) as { commitment_email?: boolean };
  const emailEnabled = prefs.commitment_email !== false; // default ON

  if (!emailEnabled) {
    return await appendDeliveryLog(supabase, commitmentId, log, {
      channel: "email",
      status: "skipped",
      reason: "broker disabled commitment_email",
      attempted_at: new Date().toISOString(),
    });
  }

  // Load contact for caller name/phone
  let callerName: string | null = null;
  let callerPhone: string | null = null;
  if (commitment.contact_id) {
    const { data: contact } = await supabase
      .from("portal_contacts")
      .select("first_name, last_name, phone_number")
      .eq("id", commitment.contact_id)
      .maybeSingle();
    if (contact) {
      callerName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null;
      callerPhone = contact.phone_number;
    }
  }

  // Load call classification (intent_type, line_of_business) if call_id is set
  let intentType: string | null = null;
  let lineOfBusiness: string | null = null;
  if (commitment.call_id) {
    const { data: call } = await supabase
      .from("portal_calls")
      .select("intent_type, line_of_business")
      .eq("id", commitment.call_id)
      .maybeSingle();
    if (call) {
      intentType = call.intent_type;
      lineOfBusiness = call.line_of_business;
    }
  }

  const orgRecord = (commitment.org as unknown) as { name?: string } | null;
  const orgName = orgRecord?.name ?? "Court Side AI";
  const portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.court-side.ai";
  const portalCallUrl = commitment.call_id
    ? `${portalBaseUrl}/calls/${commitment.call_id}`
    : `${portalBaseUrl}/bookings`;
  const brokerName = [broker.first_name, broker.last_name].filter(Boolean).join(" ") || null;

  const rendered = renderBrokerCommitmentEmail({
    brokerName,
    callerName,
    callerPhone,
    intentType,
    lineOfBusiness,
    summary: commitment.intake_summary ?? null,
    commitmentText: commitment.commitment_text,
    commitmentType: commitment.type,
    scheduledFor: commitment.scheduled_for,
    callbackWindowStart: commitment.callback_window_start,
    callbackWindowEnd: commitment.callback_window_end,
    portalCallUrl,
    orgName,
  });

  let messageId: string | null = null;
  let sendError: string | null = null;
  try {
    const result = await sendEmail({
      to: broker.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    messageId = result.messageId;
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
  }

  const newEntry: DeliveryLogEntry = sendError
    ? {
        channel: "email",
        status: "failed",
        recipient: broker.email,
        attempted_at: new Date().toISOString(),
        error: sendError.slice(0, 500),
      }
    : {
        channel: "email",
        status: "success",
        recipient: broker.email,
        attempted_at: new Date().toISOString(),
        message_id: messageId ?? undefined,
      };

  // Append delivery log; flip status to delivered if this is the first successful channel.
  const updatedLog = [...log, newEntry];
  const updatePayload: Record<string, unknown> = { delivery_log: updatedLog };
  if (!sendError && commitment.status === "pending") {
    updatePayload.status = "delivered";
  }
  await supabase
    .from("portal_commitments")
    .update(updatePayload)
    .eq("id", commitmentId);

  if (sendError) {
    return errorResponse(`Email send failed: ${sendError}`, 502);
  }
  return jsonResponse({ ok: true, channel: "email", message_id: messageId });
}

async function notifyOrgSubscribers(callId: string): Promise<Response> {
  const supabase = getServiceClient();

  const { data: call } = await supabase
    .from("portal_calls")
    .select(`
      id, org_id, intent_type,
      org:portal_organizations(id, name, broker_notification_rule)
    `)
    .eq("id", callId)
    .maybeSingle();
  if (!call) return errorResponse(`Call not found: ${callId}`, 404);

  const orgRecord = (call.org as unknown) as { name?: string; broker_notification_rule?: unknown } | null;
  const rule = (orgRecord?.broker_notification_rule ?? {}) as {
    subscribe_to?: string | { intent_types?: string[] };
    subscriber_user_ids?: string[];
  };
  const subscriberIds = Array.isArray(rule.subscriber_user_ids) ? rule.subscriber_user_ids : [];

  if (subscriberIds.length === 0) {
    return jsonResponse({ ok: true, skipped: true, reason: "no org subscribers" });
  }

  // Determine if the rule applies
  let ruleMatches = false;
  if (typeof rule.subscribe_to === "string") {
    if (rule.subscribe_to === "every_call") {
      ruleMatches = true;
    } else if (rule.subscribe_to === "commitment_only") {
      // Only matches if at least one commitment exists for the call
      const { data: existing } = await supabase
        .from("portal_commitments")
        .select("id")
        .eq("call_id", callId)
        .limit(1);
      ruleMatches = (existing?.length ?? 0) > 0;
    }
  } else if (rule.subscribe_to && typeof rule.subscribe_to === "object" && Array.isArray(rule.subscribe_to.intent_types)) {
    ruleMatches = !!call.intent_type && rule.subscribe_to.intent_types.includes(call.intent_type);
  }

  if (!ruleMatches) {
    return jsonResponse({ ok: true, skipped: true, reason: "rule did not match" });
  }

  // Find the first commitment for this call (for email content); if none, use a stub.
  const { data: commitment } = await supabase
    .from("portal_commitments")
    .select("id")
    .eq("call_id", callId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // For each subscriber, send a copy. Reuse the same template.
  const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];
  for (const subscriberId of subscriberIds) {
    const { data: subscriber } = await supabase
      .from("portal_users")
      .select("id, email, first_name, last_name")
      .eq("id", subscriberId)
      .maybeSingle();
    if (!subscriber?.email) {
      results.push({ user_id: subscriberId, ok: false, error: "no email" });
      continue;
    }

    if (commitment?.id) {
      // Render same email content as the broker email but to the subscriber.
      // Cheaper path: just call notifyBrokerOfCommitment? No — that is broker-id-keyed.
      // Render directly here, using the existing commitment data.
      try {
        const { data: full } = await supabase
          .from("portal_commitments")
          .select(`
            id, org_id, call_id, type, scheduled_for, callback_window_start,
            callback_window_end, commitment_text, intake_summary,
            contact:portal_contacts(first_name, last_name, phone_number),
            org:portal_organizations(name)
          `)
          .eq("id", commitment.id)
          .maybeSingle();
        if (!full) { results.push({ user_id: subscriberId, ok: false, error: "commitment vanished" }); continue; }

        const contactRecord = (full.contact as unknown) as { first_name?: string; last_name?: string; phone_number?: string } | null;
        const orgInner = (full.org as unknown) as { name?: string } | null;
        const callerName = contactRecord ? [contactRecord.first_name, contactRecord.last_name].filter(Boolean).join(" ") || null : null;

        const portalBaseUrl = Deno.env.get("PORTAL_BASE_URL") || "https://app.court-side.ai";
        const subscriberName = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(" ") || null;
        const rendered = renderBrokerCommitmentEmail({
          brokerName: subscriberName,
          callerName,
          callerPhone: contactRecord?.phone_number ?? null,
          intentType: call.intent_type,
          lineOfBusiness: null,
          summary: full.intake_summary ?? null,
          commitmentText: full.commitment_text,
          commitmentType: full.type,
          scheduledFor: full.scheduled_for,
          callbackWindowStart: full.callback_window_start,
          callbackWindowEnd: full.callback_window_end,
          portalCallUrl: full.call_id ? `${portalBaseUrl}/calls/${full.call_id}` : `${portalBaseUrl}/bookings`,
          orgName: orgInner?.name ?? "Court Side AI",
        });
        await sendEmail({
          to: subscriber.email,
          subject: `[Subscriber copy] ${rendered.subject}`,
          html: rendered.html,
          text: rendered.text,
        });
        results.push({ user_id: subscriberId, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ user_id: subscriberId, ok: false, error: message });
      }
    }
  }

  return jsonResponse({ ok: true, sent: results.filter((r) => r.ok).length, results });
}

async function retryUndelivered(): Promise<Response> {
  const supabase = getServiceClient();
  // Find commitments with no successful delivery yet AND last attempt older than threshold.
  // Simple heuristic: status = 'pending' AND created_at older than 5 min.
  const cutoff = new Date(Date.now() - RETRY_THRESHOLD_MS).toISOString();
  const { data: candidates, error } = await supabase
    .from("portal_commitments")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(50);

  if (error) return errorResponse(`Retry query failed: ${error.message}`, 500);
  if (!candidates || candidates.length === 0) {
    return jsonResponse({ retried: 0 });
  }

  const results: Array<{ commitment_id: string; ok: boolean; error?: string }> = [];
  for (const c of candidates) {
    try {
      const r = await notifyBrokerOfCommitment(c.id);
      results.push({ commitment_id: c.id, ok: r.status === 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ commitment_id: c.id, ok: false, error: message });
    }
  }
  return jsonResponse({ retried: results.length, results });
}

async function appendDeliveryLog(
  supabase: ReturnType<typeof getServiceClient>,
  commitmentId: string,
  existingLog: DeliveryLogEntry[],
  newEntry: DeliveryLogEntry,
): Promise<Response> {
  const updated = [...existingLog, newEntry];
  await supabase
    .from("portal_commitments")
    .update({ delivery_log: updated })
    .eq("id", commitmentId);
  return jsonResponse({ ok: true, channel: newEntry.channel, status: newEntry.status, reason: newEntry.reason });
}
