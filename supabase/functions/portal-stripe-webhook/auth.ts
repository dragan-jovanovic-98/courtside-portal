// Service-role client for portal-stripe-webhook. Webhook doesn't need JWT auth
// (signature verification is the gate) but needs the service role to bypass RLS.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
