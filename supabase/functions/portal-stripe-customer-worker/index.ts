// portal-stripe-customer-worker
//
// Drains portal_stripe_customer_queue. For each pending row:
//   1. Claim the row (pending → processing, attempts += 1)
//   2. Look up the org (name, email preference: billing_email → primary_email → first user's email)
//   3. Create a Stripe customer with org_id in metadata
//   4. Write stripe_customer_id back to portal_organizations
//   5. Mark the queue row done
//
// On error: record last_error, mark failed after 5 attempts, leave as pending otherwise.
//
// Invocation: POST with x-worker-secret header matching WORKER_SECRET env var.
// verify_jwt: false. The edge function does its own auth via the shared secret,
// which is the same pattern (and the same secret value) the legacy worker uses.
// pg_cron reads the secret from vault and forwards it as x-worker-secret.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getStripe } from "./stripe.ts";
import { getServiceClient, jsonResponse } from "./auth.ts";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Custom auth: shared-secret header check. Matches the legacy pattern so the
  // existing vault secret can drive pg_cron invocation.
  const expected = Deno.env.get("WORKER_SECRET");
  const provided = req.headers.get("x-worker-secret");
  if (!expected || provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getServiceClient();
  const stripe = getStripe();

  const { data: pending, error: fetchErr } = await supabase
    .from("portal_stripe_customer_queue")
    .select("id, org_id, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error("[customer-worker] Failed to fetch queue:", fetchErr);
    return jsonResponse({ error: fetchErr.message }, 500);
  }

  if (!pending || pending.length === 0) {
    return jsonResponse({ processed: 0, failed: 0, skipped: 0 });
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of pending) {
    const nextAttempts = row.attempts + 1;

    // Claim. The second .eq("status", "pending") prevents races with a
    // concurrent worker — if someone else beat us to it, update affects zero
    // rows and we skip.
    const { data: claimed, error: claimErr } = await supabase
      .from("portal_stripe_customer_queue")
      .update({ status: "processing", attempts: nextAttempts })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimErr) {
      console.error("[customer-worker] Claim error for row", row.id, claimErr);
      skipped++;
      continue;
    }
    if (!claimed) {
      skipped++;
      continue;
    }

    try {
      const { data: org, error: orgErr } = await supabase
        .from("portal_organizations")
        .select("id, name, primary_email, billing_email, stripe_customer_id")
        .eq("id", row.org_id)
        .single();

      if (orgErr || !org) {
        throw new Error(`Org not found: ${orgErr?.message || row.org_id}`);
      }

      // Already linked → mark done without creating a duplicate.
      if (org.stripe_customer_id) {
        await supabase
          .from("portal_stripe_customer_queue")
          .update({
            status: "done",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", row.id);
        processed++;
        continue;
      }

      let email: string | null = org.billing_email || org.primary_email;
      if (!email) {
        const { data: firstUser } = await supabase
          .from("portal_users")
          .select("email")
          .eq("org_id", org.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        email = firstUser?.email ?? null;
      }

      if (!email) {
        throw new Error(
          "No email available for Stripe customer creation (billing_email, primary_email, and portal_users are all empty)",
        );
      }

      const customer = await stripe.customers.create({
        email,
        name: org.name,
        metadata: { org_id: org.id },
      });

      const { error: updateOrgErr } = await supabase
        .from("portal_organizations")
        .update({ stripe_customer_id: customer.id })
        .eq("id", org.id);

      if (updateOrgErr) {
        throw new Error(
          `Stripe customer ${customer.id} created but DB update failed: ${updateOrgErr.message}`,
        );
      }

      await supabase
        .from("portal_stripe_customer_queue")
        .update({
          status: "done",
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[customer-worker] Failed for row", row.id, msg);

      const finalStatus = nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await supabase
        .from("portal_stripe_customer_queue")
        .update({
          status: finalStatus,
          last_error: msg,
        })
        .eq("id", row.id);

      if (finalStatus === "failed") {
        failed++;
      }
    }
  }

  return jsonResponse({
    processed,
    failed,
    skipped,
    batch_size: pending.length,
  });
});
