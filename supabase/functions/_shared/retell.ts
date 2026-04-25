// Retell client + signature verification + payload types.
//
// Webhook signature format per Retell docs: x-retell-signature: v=<unix_ts_ms>,d=<hex_hmac>
// The HMAC is computed over `${timestamp}.${body}` using the webhook secret.

const RETELL_BASE_URL = "https://api.retellai.com";

interface RetellFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function retellFetch<T = unknown>(
  path: string,
  options: RetellFetchOptions = {},
): Promise<T> {
  const apiKey = Deno.env.get("RETELL_API_KEY");
  if (!apiKey) {
    throw new Error("RETELL_API_KEY is not set in edge function secrets.");
  }
  const res = await fetch(`${RETELL_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Retell API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Verify a Retell webhook signature.
 *
 * Headers carry: `x-retell-signature: v=<unix_ts_ms>,d=<hex_hmac>`
 * The HMAC-SHA256 is computed over `${timestamp}.${rawBody}` using the
 * RETELL_WEBHOOK_SECRET. We also require the timestamp to be recent (within
 * 5 minutes) to prevent replay attacks.
 *
 * Returns true if the signature is valid; false otherwise.
 */
export async function verifyRetellSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceMs = 5 * 60 * 1000,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    }),
  );
  const ts = Number(parts.v);
  const providedHash = String(parts.d ?? "");
  if (!Number.isFinite(ts) || !providedHash) return false;
  if (Math.abs(Date.now() - ts) > toleranceMs) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${ts}.${rawBody}`),
  );
  const expectedHex = Array.from(new Uint8Array(signedBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expectedHex.length !== providedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ providedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================
// Retell webhook payload types — based on the sample at
// reference/retell-sample-post-call-webhook.txt
// ============================================================

export interface RetellWebhookEnvelope {
  event: "call_started" | "call_ended" | "call_analyzed" | string;
  call: RetellCall;
  event_timestamp: number;
}

export interface RetellCall {
  call_id: string;
  call_type?: string;
  agent_id: string;
  agent_version?: number;
  agent_name?: string;
  retell_llm_dynamic_variables?: Record<string, unknown>;
  collected_dynamic_variables?: Record<string, unknown>;
  custom_sip_headers?: Record<string, string>;
  call_status?: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;
  transcript: string;
  transcript_object?: RetellTranscriptEntry[];
  transcript_with_tool_calls?: RetellTranscriptEntry[];
  recording_url?: string;
  recording_multi_channel_url?: string;
  public_log_url?: string;
  knowledge_base_retrieved_contents_url?: string;
  disconnection_reason?: string;
  data_storage_setting?: string;
  opt_in_signed_url?: boolean;
  latency?: RetellLatencyMetrics;
  call_cost?: RetellCallCost;
  call_analysis?: RetellCallAnalysis;
  llm_token_usage?: { values?: number[]; average?: number; num_requests?: number };
  tool_calls?: RetellToolCall[];
  from_number: string;
  to_number: string;
  direction: "inbound" | "outbound";
  telephony_identifier?: { twilio_call_sid?: string };
}

export interface RetellTranscriptEntry {
  role: "agent" | "user" | "tool_call_invocation" | "tool_call_result" | string;
  content?: string;
  words?: Array<{ word: string; start: number; end: number }>;
  metadata?: Record<string, unknown>;
  // Tool-call-specific fields when present in transcript_with_tool_calls
  tool_call_id?: string;
  name?: string;
  arguments?: string;
}

export interface RetellToolCall {
  tool_call_id: string;
  name: string;
  type: string;
  start_time_sec?: number;
  arguments?: string;
}

export interface RetellCallCost {
  product_costs: Array<{ product: string; unit_price?: number; cost: number }>;
  total_duration_seconds?: number;
  total_duration_unit_price?: number;
  combined_cost: number;
}

export interface RetellLatencyBucket {
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  min?: number;
  max?: number;
  num?: number;
  sum?: number;
  values?: number[];
}

export interface RetellLatencyMetrics {
  llm?: RetellLatencyBucket;
  e2e?: RetellLatencyBucket;
  tts?: RetellLatencyBucket;
  knowledge_base?: RetellLatencyBucket;
  asr?: RetellLatencyBucket;
}

export interface RetellCallAnalysis {
  call_summary: string | null;
  in_voicemail: boolean | null;
  user_sentiment: string | null;
  call_successful: boolean | null;
  custom_analysis_data: Record<string, unknown> | null;
}
