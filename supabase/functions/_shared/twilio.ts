// Twilio SMS client for Phase C caller-SMS tools.
//
// Twilio Messages API: POST https://api.twilio.com/2010-04-01/Accounts/{Sid}/Messages.json
// Auth: Basic with TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN.
// From: TWILIO_FROM_NUMBER (a Court Side-owned Twilio number).

export interface SendSmsParams {
  to: string;
  body: string;
  /** Optional override for the from number. Defaults to TWILIO_FROM_NUMBER env var. */
  fromNumber?: string;
}

export interface SendSmsResult {
  sid: string;
  status: string;
}

export async function sendSms({ to, body, fromNumber }: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in edge function secrets.");
  }
  const from = fromNumber ?? Deno.env.get("TWILIO_FROM_NUMBER");
  if (!from) {
    throw new Error("TWILIO_FROM_NUMBER is not set and no fromNumber override provided.");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formBody = new URLSearchParams({ To: to, From: from, Body: body });
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio ${res.status}: ${text}`);
  }

  const json = await res.json();
  return {
    sid: json.sid,
    status: json.status,
  };
}
