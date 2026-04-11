-- Migration 010: Phase B Stripe schema
--
-- Adds the tables, indexes, triggers, and RLS needed for the new Stripe
-- integration, which lives entirely in Supabase edge functions.
--
-- What this migration adds:
--   1. portal_plans                    — plan templates (1 Stripe Product+Price per row)
--   2. portal_stripe_customer_queue    — async queue drained by portal-stripe-customer-worker
--   3. portal_stripe_event_log         — idempotency log for portal-stripe-webhook
--   4. portal_subscriptions.plan_id    — FK to portal_plans
--   5. Unique index on portal_subscriptions(stripe_subscription_id)  — allows ON CONFLICT upsert
--   6. Partial unique index forcing one non-terminal sub per org      — allows plan-change history
--   7. portal_enqueue_stripe_customer_create() + trigger on portal_organizations INSERT
--
-- The legacy mortgage broker Stripe infrastructure (stripe_customer_create_queue,
-- stripe_event_log, stripe-webhook edge function, etc.) is untouched.

-- =============================================================================
-- 1. portal_plans — template for subscription pricing
-- =============================================================================
CREATE TABLE portal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES portal_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  monthly_base_price_cents INTEGER NOT NULL CHECK (monthly_base_price_cents >= 0),
  included_minutes INTEGER NOT NULL CHECK (included_minutes >= 0),
  overage_per_minute_cents INTEGER NOT NULL DEFAULT 0 CHECK (overage_per_minute_cents >= 0),
  setup_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (setup_fee_cents >= 0),
  setup_fee_covers_days INTEGER NOT NULL DEFAULT 0 CHECK (setup_fee_covers_days >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_plans_org_active
  ON portal_plans(org_id, is_active);

CREATE TRIGGER trg_portal_plans_updated_at
  BEFORE UPDATE ON portal_plans
  FOR EACH ROW
  EXECUTE FUNCTION portal_update_updated_at();

COMMENT ON TABLE portal_plans IS
  'Subscription plan templates. Each row links to one Stripe Product and one Stripe Price. Custom-per-client: org_id is set to the client org. Plans are immutable once a subscription references them — plan changes create new rows, preserving history.';

COMMENT ON COLUMN portal_plans.setup_fee_covers_days IS
  'If > 0, the subscription is created with trial_period_days = this value so the first recurring invoice does not land until after the setup fee period. Bridges setup fee invoice and first subscription invoice.';


-- =============================================================================
-- 2. portal_stripe_customer_queue — async customer creation queue
-- =============================================================================
CREATE TABLE portal_stripe_customer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (org_id)
);

-- Fast lookup of pending rows for the worker
CREATE INDEX idx_portal_stripe_customer_queue_pending
  ON portal_stripe_customer_queue(created_at)
  WHERE status = 'pending';

COMMENT ON TABLE portal_stripe_customer_queue IS
  'Async queue drained by the portal-stripe-customer-worker edge function. Populated by a trigger on portal_organizations INSERT. Worker creates the Stripe customer, writes the ID back to portal_organizations, and marks the row done.';


-- =============================================================================
-- 3. portal_stripe_event_log — idempotency log for webhooks
-- =============================================================================
CREATE TABLE portal_stripe_event_log (
  id TEXT PRIMARY KEY,  -- Stripe event ID, e.g. evt_1ABC...
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_portal_stripe_event_log_type_received
  ON portal_stripe_event_log(event_type, received_at DESC);

COMMENT ON TABLE portal_stripe_event_log IS
  'Every incoming Stripe webhook is recorded here first via INSERT ... ON CONFLICT (id) DO NOTHING. If the conflict hits, the event was already processed and the webhook handler returns 200 without re-running. Gives strong idempotency independent of Stripe signature verification.';


-- =============================================================================
-- 4. portal_subscriptions additions
-- =============================================================================
ALTER TABLE portal_subscriptions
  ADD COLUMN plan_id UUID REFERENCES portal_plans(id) ON DELETE SET NULL;

COMMENT ON COLUMN portal_subscriptions.plan_id IS
  'FK to portal_plans. Denormalized fields like plan_name and price_monthly may still be present for display convenience, but the plan_id is the source of truth.';

-- Allow the webhook to upsert by stripe_subscription_id.
-- Partial index so NULL stripe_subscription_id values (pre-Stripe rows, edge cases) don't collide.
CREATE UNIQUE INDEX idx_portal_subscriptions_stripe_sub_id
  ON portal_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Enforce: at most one non-terminal subscription per org.
-- Terminal states (canceled, incomplete_expired, unpaid) are excluded so history is preserved.
-- Non-terminal states where we want exclusivity: active, trialing, past_due, incomplete.
CREATE UNIQUE INDEX idx_portal_subscriptions_active_per_org
  ON portal_subscriptions(org_id)
  WHERE status IN ('active', 'trialing', 'past_due', 'incomplete');


-- =============================================================================
-- 5. Trigger: enqueue Stripe customer creation on new org
-- =============================================================================
CREATE OR REPLACE FUNCTION portal_enqueue_stripe_customer_create()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip if the row already has a linked Stripe customer (manual linking, tests, etc.)
  IF NEW.stripe_customer_id IS NULL THEN
    INSERT INTO portal_stripe_customer_queue (org_id)
    VALUES (NEW.id)
    ON CONFLICT (org_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portal_enqueue_stripe_customer_create
  AFTER INSERT ON portal_organizations
  FOR EACH ROW
  EXECUTE FUNCTION portal_enqueue_stripe_customer_create();


-- =============================================================================
-- 6. RLS
-- =============================================================================
-- portal_plans: org members can read their own org's plans. No write access
-- from clients — writes happen via edge functions with service role.
ALTER TABLE portal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read plans for their orgs"
  ON portal_plans FOR SELECT
  USING (
    org_id IN (SELECT portal_user_org_ids())
    OR portal_is_super_admin()
  );

-- portal_stripe_customer_queue: locked. No client access. Edge functions use service role.
ALTER TABLE portal_stripe_customer_queue ENABLE ROW LEVEL SECURITY;

-- portal_stripe_event_log: locked. No client access. Edge functions use service role.
ALTER TABLE portal_stripe_event_log ENABLE ROW LEVEL SECURITY;
