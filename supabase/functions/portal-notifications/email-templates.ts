// HTML email templates for Phase C broker notifications.
// Plain string interpolation — no React Email dependency. Edge function-friendly.

export interface BrokerCommitmentEmailVars {
  brokerName: string | null;
  callerName: string | null;
  callerPhone: string | null;
  intentType: string | null;
  lineOfBusiness: string | null;
  summary: string | null;
  commitmentText: string;
  commitmentType: string; // callback | appointment | transfer | confirmation
  scheduledFor: string | null; // ISO8601
  callbackWindowStart: string | null;
  callbackWindowEnd: string | null;
  portalCallUrl: string;
  orgName: string;
}

function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function commitmentTypeLabel(type: string): string {
  switch (type) {
    case "callback": return "Callback Requested";
    case "appointment": return "Appointment Booked";
    case "transfer": return "Live Transfer";
    case "confirmation": return "Confirmation";
    default: return type;
  }
}

export function renderBrokerCommitmentEmail(vars: BrokerCommitmentEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = vars.brokerName ? `Hi ${vars.brokerName},` : "Hi,";
  const typeLabel = commitmentTypeLabel(vars.commitmentType);
  const callerLine = vars.callerName
    ? `${vars.callerName} (${vars.callerPhone ?? "no number"})`
    : (vars.callerPhone ?? "Unknown caller");

  let timeLine = "";
  if (vars.scheduledFor) {
    timeLine = `<strong>Scheduled for:</strong> ${escapeHtml(formatTime(vars.scheduledFor))}`;
  } else if (vars.callbackWindowStart || vars.callbackWindowEnd) {
    const start = formatTime(vars.callbackWindowStart);
    const end = formatTime(vars.callbackWindowEnd);
    timeLine = `<strong>Callback window:</strong> ${escapeHtml(start)} – ${escapeHtml(end)}`;
  }

  const tags: string[] = [];
  if (vars.intentType) tags.push(vars.intentType);
  if (vars.lineOfBusiness && vars.lineOfBusiness !== "unknown") tags.push(vars.lineOfBusiness);
  const tagsHtml = tags.length
    ? `<div style="margin-top:8px;">${tags.map((t) => `<span style="display:inline-block;background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:6px;">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  const subject = `${typeLabel} — ${vars.callerName ?? "caller"} re: ${vars.intentType ?? "inquiry"} (${vars.lineOfBusiness ?? "—"})`.trim();

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:24px 28px 8px 28px;">
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(vars.orgName)} · ${escapeHtml(typeLabel)}</div>
          <h1 style="margin:8px 0 0 0;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(greeting)}</h1>
          <p style="margin:12px 0 0 0;font-size:15px;line-height:1.5;color:#374151;">A new call came in. Here's what happened:</p>
        </td></tr>
        <tr><td style="padding:8px 28px 0 28px;">
          ${tagsHtml}
        </td></tr>
        <tr><td style="padding:16px 28px 0 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.5;">
            <tr><td style="padding:6px 0;color:#6b7280;width:120px;vertical-align:top;">Caller</td><td style="padding:6px 0;color:#111827;">${escapeHtml(callerLine)}</td></tr>
            ${timeLine ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Commitment</td><td style="padding:6px 0;color:#111827;">${timeLine}</td></tr>` : ""}
            <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">What we promised</td><td style="padding:6px 0;color:#111827;font-style:italic;">"${escapeHtml(vars.commitmentText)}"</td></tr>
            ${vars.summary ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Summary</td><td style="padding:6px 0;color:#374151;">${escapeHtml(vars.summary)}</td></tr>` : ""}
          </table>
        </td></tr>
        <tr><td style="padding:24px 28px 28px 28px;">
          <a href="${escapeHtml(vars.portalCallUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;padding:10px 16px;border-radius:6px;">View call in portal</a>
        </td></tr>
      </table>
      <p style="font-size:11px;color:#9ca3af;margin-top:16px;">Sent by Court Side AI on behalf of ${escapeHtml(vars.orgName)}.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    `${greeting}`,
    `A new call came in.`,
    ``,
    `Caller: ${callerLine}`,
    timeLine ? `${typeLabel}: ${vars.scheduledFor ? formatTime(vars.scheduledFor) : `${formatTime(vars.callbackWindowStart)} – ${formatTime(vars.callbackWindowEnd)}`}` : `${typeLabel}`,
    `What we promised: "${vars.commitmentText}"`,
    vars.summary ? `Summary: ${vars.summary}` : "",
    ``,
    `View call: ${vars.portalCallUrl}`,
    ``,
    `Sent by Court Side AI on behalf of ${vars.orgName}.`,
  ];
  const text = textLines.filter(Boolean).join("\n");

  return { subject, html, text };
}
