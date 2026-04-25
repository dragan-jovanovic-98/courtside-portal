// SendGrid email client for Phase C broker notifications.
//
// SendGrid Mail Send API: POST https://api.sendgrid.com/v3/mail/send
// Requires SENDGRID_API_KEY (Bearer) + SENDGRID_FROM_EMAIL (verified sender).

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Optional override for the from address. Defaults to SENDGRID_FROM_EMAIL env var. */
  fromEmail?: string;
  /** Optional display name for the sender. */
  fromName?: string;
  /** Optional Reply-To address. */
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string | null;
  status: number;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromEmail,
  fromName,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set in edge function secrets.");
  }
  const from = fromEmail ?? Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!from) {
    throw new Error("SENDGRID_FROM_EMAIL is not set and no fromEmail override provided.");
  }

  const recipients = Array.isArray(to) ? to : [to];
  const personalizations = [{ to: recipients.map((email) => ({ email })) }];
  const content: Array<{ type: string; value: string }> = [];
  if (text) content.push({ type: "text/plain", value: text });
  content.push({ type: "text/html", value: html });

  const body: Record<string, unknown> = {
    personalizations,
    from: fromName ? { email: from, name: fromName } : { email: from },
    subject,
    content,
  };
  if (replyTo) {
    body.reply_to = { email: replyTo };
  }

  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // SendGrid returns 202 Accepted with X-Message-Id header on success.
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SendGrid ${res.status}: ${errorText}`);
  }

  return {
    messageId: res.headers.get("x-message-id"),
    status: res.status,
  };
}
