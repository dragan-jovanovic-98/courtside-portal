-- Phase C foundation: agent ingestion, post-call pipeline, commitments, recording disclosures
-- Adds enums, extends existing tables, creates 6 new tables + RLS + indexes + seed function update

-- ============================================================
-- 1. New enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE portal_agent_role AS ENUM ('router', 'specialist', 'after_hours', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_intent_type AS ENUM ('sales', 'service', 'commercial', 'claim', 'wrong_number', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_line_of_business AS ENUM ('auto', 'home', 'life', 'health', 'commercial', 'specialty', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_analysis_status AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_commitment_type AS ENUM ('callback', 'appointment', 'transfer', 'confirmation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE portal_commitment_status AS ENUM ('pending', 'delivered', 'kept', 'missed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. portal_recording_disclosures (created first; FKs reference it later)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_recording_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  body_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_recording_disclosures_default
  ON portal_recording_disclosures (jurisdiction, language)
  WHERE is_default = TRUE;

ALTER TABLE portal_recording_disclosures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_recording_disclosures_select_authenticated" ON portal_recording_disclosures;
CREATE POLICY "portal_recording_disclosures_select_authenticated"
  ON portal_recording_disclosures FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "portal_recording_disclosures_modify_super_admin" ON portal_recording_disclosures;
CREATE POLICY "portal_recording_disclosures_modify_super_admin"
  ON portal_recording_disclosures FOR ALL
  TO authenticated
  USING (portal_is_super_admin())
  WITH CHECK (portal_is_super_admin());

DROP TRIGGER IF EXISTS trg_portal_recording_disclosures_updated_at ON portal_recording_disclosures;
CREATE TRIGGER trg_portal_recording_disclosures_updated_at
  BEFORE UPDATE ON portal_recording_disclosures
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

-- ============================================================
-- 3. Extend portal_agents
-- ============================================================

ALTER TABLE portal_agents
  ADD COLUMN IF NOT EXISTS retell_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS role portal_agent_role NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS intake_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_function_name TEXT NOT NULL DEFAULT 'portal-post-call-analysis',
  ADD COLUMN IF NOT EXISTS active_hours JSONB,
  ADD COLUMN IF NOT EXISTS recording_disclosure_id UUID REFERENCES portal_recording_disclosures(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_agents_retell_agent_id
  ON portal_agents (retell_agent_id) WHERE retell_agent_id IS NOT NULL;

COMMENT ON COLUMN portal_agents.livekit_agent_id IS 'DEPRECATED — Phase C migrates to Retell. Future cleanup migration drops this column.';

-- ============================================================
-- 4. Extend portal_phone_numbers
-- ============================================================

ALTER TABLE portal_phone_numbers
  ADD COLUMN IF NOT EXISTS retell_phone_id TEXT,
  ADD COLUMN IF NOT EXISTS owned_by_court_side BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 5. Extend portal_calls (Retell-rich fields)
-- ============================================================

ALTER TABLE portal_calls
  ADD COLUMN IF NOT EXISTS intent_type portal_intent_type,
  ADD COLUMN IF NOT EXISTS line_of_business portal_line_of_business,
  ADD COLUMN IF NOT EXISTS analysis_status portal_analysis_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS analysis_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_error TEXT,
  ADD COLUMN IF NOT EXISTS analysis_retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retell_call_id TEXT,
  ADD COLUMN IF NOT EXISTS retell_agent_version INTEGER,
  ADD COLUMN IF NOT EXISTS retell_agent_name TEXT,
  ADD COLUMN IF NOT EXISTS to_number TEXT,
  ADD COLUMN IF NOT EXISTS disconnection_reason TEXT,
  ADD COLUMN IF NOT EXISTS retell_dynamic_variables JSONB,
  ADD COLUMN IF NOT EXISTS retell_collected_variables JSONB,
  ADD COLUMN IF NOT EXISTS retell_call_summary TEXT,
  ADD COLUMN IF NOT EXISTS retell_user_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS retell_call_successful BOOLEAN,
  ADD COLUMN IF NOT EXISTS retell_in_voicemail BOOLEAN,
  ADD COLUMN IF NOT EXISTS retell_custom_analysis_data JSONB,
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS tool_call_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retell_cost_cents NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS retell_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS analysis_cost_cents NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS analysis_token_usage JSONB,
  ADD COLUMN IF NOT EXISTS recording_multi_channel_url TEXT,
  ADD COLUMN IF NOT EXISTS public_log_url TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_base_retrieved_url TEXT,
  ADD COLUMN IF NOT EXISTS latency_metrics JSONB,
  ADD COLUMN IF NOT EXISTS recording_disclosure_id UUID REFERENCES portal_recording_disclosures(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_calls_retell_call_id
  ON portal_calls (retell_call_id) WHERE retell_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_portal_calls_analysis_status
  ON portal_calls (analysis_status)
  WHERE analysis_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS ix_portal_calls_org_intent
  ON portal_calls (org_id, intent_type)
  WHERE intent_type IS NOT NULL;

-- Existing rows (pre-Phase-C, no Retell origin): mark skipped so retry cron ignores them
UPDATE portal_calls SET analysis_status = 'skipped' WHERE retell_call_id IS NULL AND analysis_status = 'pending';

-- ============================================================
-- 6. Extend portal_contacts
-- ============================================================

ALTER TABLE portal_contacts
  ADD COLUMN IF NOT EXISTS assigned_broker_id UUID REFERENCES portal_users(id);

CREATE INDEX IF NOT EXISTS ix_portal_contacts_assigned_broker
  ON portal_contacts (assigned_broker_id) WHERE assigned_broker_id IS NOT NULL;

-- ============================================================
-- 7. Extend portal_organizations
-- ============================================================

ALTER TABLE portal_organizations
  ADD COLUMN IF NOT EXISTS default_recording_disclosure_id UUID REFERENCES portal_recording_disclosures(id),
  ADD COLUMN IF NOT EXISTS broker_notification_rule JSONB NOT NULL DEFAULT '{"subscribe_to":"commitment_only","subscriber_user_ids":[]}'::jsonb;

-- ============================================================
-- 8. portal_commitments (kept-callback object — first-class)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES portal_calls(id) ON DELETE CASCADE,
  retell_call_id TEXT,
  broker_id UUID REFERENCES portal_users(id),
  contact_id UUID REFERENCES portal_contacts(id),
  type portal_commitment_type NOT NULL,
  scheduled_for TIMESTAMPTZ,
  callback_window_start TIMESTAMPTZ,
  callback_window_end TIMESTAMPTZ,
  commitment_text TEXT NOT NULL,
  intake_summary TEXT,
  intake_data JSONB,
  status portal_commitment_status NOT NULL DEFAULT 'pending',
  delivery_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_via_tool TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_portal_commitments_org_status ON portal_commitments (org_id, status);
CREATE INDEX IF NOT EXISTS ix_portal_commitments_broker_status ON portal_commitments (broker_id, status);
CREATE INDEX IF NOT EXISTS ix_portal_commitments_call_id ON portal_commitments (call_id);
CREATE INDEX IF NOT EXISTS ix_portal_commitments_retell_call_id ON portal_commitments (retell_call_id) WHERE retell_call_id IS NOT NULL;

ALTER TABLE portal_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_commitments_select_org_members" ON portal_commitments;
CREATE POLICY "portal_commitments_select_org_members"
  ON portal_commitments FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT portal_user_org_ids())
    OR portal_is_super_admin()
  );

DROP POLICY IF EXISTS "portal_commitments_modify_super_admin" ON portal_commitments;
CREATE POLICY "portal_commitments_modify_super_admin"
  ON portal_commitments FOR ALL
  TO authenticated
  USING (portal_is_super_admin())
  WITH CHECK (portal_is_super_admin());

DROP TRIGGER IF EXISTS trg_portal_commitments_updated_at ON portal_commitments;
CREATE TRIGGER trg_portal_commitments_updated_at
  BEFORE UPDATE ON portal_commitments
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

-- ============================================================
-- 9. portal_retell_event_log (idempotency log; service role only)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_retell_event_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE portal_retell_event_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. portal_call_analysis_attempts (cost + retry observability)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_call_analysis_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES portal_calls(id) ON DELETE CASCADE,
  status portal_analysis_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  prompt_token_count INTEGER,
  completion_token_count INTEGER,
  model TEXT
);

CREATE INDEX IF NOT EXISTS ix_portal_call_analysis_attempts_call_started
  ON portal_call_analysis_attempts (call_id, started_at DESC);

ALTER TABLE portal_call_analysis_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_call_analysis_attempts_select_org_members" ON portal_call_analysis_attempts;
CREATE POLICY "portal_call_analysis_attempts_select_org_members"
  ON portal_call_analysis_attempts FOR SELECT
  TO authenticated
  USING (
    call_id IN (SELECT id FROM portal_calls WHERE org_id IN (SELECT portal_user_org_ids()))
    OR portal_is_super_admin()
  );

-- ============================================================
-- 11. portal_calendar_groups + memberships (data model only — no UI in V1)
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_calendar_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  routing_strategy TEXT NOT NULL DEFAULT 'round_robin',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_calendar_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES portal_calendar_groups(id) ON DELETE CASCADE,
  calendar_connection_id UUID NOT NULL REFERENCES portal_calendar_connections(id) ON DELETE CASCADE,
  priority INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, calendar_connection_id)
);

CREATE INDEX IF NOT EXISTS ix_portal_calendar_groups_org ON portal_calendar_groups (org_id);

ALTER TABLE portal_calendar_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_calendar_group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_calendar_groups_select_org" ON portal_calendar_groups;
CREATE POLICY "portal_calendar_groups_select_org"
  ON portal_calendar_groups FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

DROP POLICY IF EXISTS "portal_calendar_groups_modify_admin" ON portal_calendar_groups;
CREATE POLICY "portal_calendar_groups_modify_admin"
  ON portal_calendar_groups FOR ALL
  TO authenticated
  USING (
    portal_is_super_admin()
    OR COALESCE(portal_user_role_in_org(org_id) IN ('owner', 'admin'), false)
  )
  WITH CHECK (
    portal_is_super_admin()
    OR COALESCE(portal_user_role_in_org(org_id) IN ('owner', 'admin'), false)
  );

DROP POLICY IF EXISTS "portal_calendar_group_memberships_select_org" ON portal_calendar_group_memberships;
CREATE POLICY "portal_calendar_group_memberships_select_org"
  ON portal_calendar_group_memberships FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM portal_calendar_groups WHERE org_id IN (SELECT portal_user_org_ids())
    )
    OR portal_is_super_admin()
  );

DROP POLICY IF EXISTS "portal_calendar_group_memberships_modify_admin" ON portal_calendar_group_memberships;
CREATE POLICY "portal_calendar_group_memberships_modify_admin"
  ON portal_calendar_group_memberships FOR ALL
  TO authenticated
  USING (
    portal_is_super_admin()
    OR group_id IN (
      SELECT cg.id FROM portal_calendar_groups cg
      WHERE COALESCE(portal_user_role_in_org(cg.org_id) IN ('owner', 'admin'), false)
    )
  )
  WITH CHECK (
    portal_is_super_admin()
    OR group_id IN (
      SELECT cg.id FROM portal_calendar_groups cg
      WHERE COALESCE(portal_user_role_in_org(cg.org_id) IN ('owner', 'admin'), false)
    )
  );

-- ============================================================
-- 12. portal_seed_outcome_categories: fix impact_tier bug + add insurance branch
-- ============================================================
-- Note: the prior version of this function still referenced impact_tier (removed in migration 010).
-- This rewrite drops impact_tier, adds descriptions to all categories (used by the LLM classifier),
-- and adds the insurance branch.

CREATE OR REPLACE FUNCTION public.portal_seed_outcome_categories(p_org_id uuid, p_industry text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Universal defaults
  INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
    (p_org_id, 'Appointment Booked', 'Caller booked a confirmed appointment with the team.', 50, 1),
    (p_org_id, 'Quote Request', 'Caller asked for a quote or pricing information.', 20, 2),
    (p_org_id, 'Callback Requested', 'Caller wants someone to call them back at a stated time or window.', 15, 3),
    (p_org_id, 'Message Taken', 'Caller left a message for the team that does not require an immediate callback or appointment.', 0, 4),
    (p_org_id, 'Information Provided', 'Caller asked a general question; the agent answered it without further follow-up.', 0, 5),
    (p_org_id, 'Wrong Number', 'Caller dialed the wrong number or reached the wrong organization.', 0, 6),
    (p_org_id, 'Spam', 'Spam, robocall, or telemarketing call.', 0, 7);

  IF p_industry = 'legal' THEN
    INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
      (p_org_id, 'Intake Completed', 'New client intake form completed during the call.', 60, 8),
      (p_org_id, 'Consultation Scheduled', 'Caller scheduled a consultation with an attorney.', 45, 9);
  ELSIF p_industry = 'medical' OR p_industry = 'dental' THEN
    INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
      (p_org_id, 'Patient Scheduled', 'Patient scheduled an appointment.', 70, 8),
      (p_org_id, 'Prescription Inquiry', 'Caller asked about prescription refills or status.', 5, 9);
  ELSIF p_industry = 'home_services' THEN
    INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
      (p_org_id, 'Estimate Scheduled', 'Caller scheduled an in-person estimate.', 35, 8),
      (p_org_id, 'Emergency Dispatched', 'Emergency service dispatched to the caller.', 80, 9);
  ELSIF p_industry = 'sports' OR p_industry = 'recreation' THEN
    INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
      (p_org_id, 'Court/Facility Booked', 'Court or facility was booked.', 90, 8),
      (p_org_id, 'Membership Inquiry', 'Caller asked about membership or pricing.', 25, 9);
  ELSIF p_industry = 'insurance' THEN
    INSERT INTO portal_outcome_categories (org_id, name, description, close_likelihood, sort_order) VALUES
      (p_org_id, 'New Quote Inquiry', 'Caller asked about a new policy or quote (auto, home, life, health, commercial, specialty). The agent collected basic intake to hand off to a producer.', 30, 8),
      (p_org_id, 'Existing Policy Question', 'Existing client calling about their current policy: payment, coverage, ID cards, billing, etc.', 0, 9),
      (p_org_id, 'Claim Notice', 'Caller is reporting a new claim or asking about an in-progress claim. Triaged for handoff (typically to carrier or broker claims handler).', 0, 10),
      (p_org_id, 'Beneficiary or Death Notification', 'Sensitive call: beneficiary inquiry, death notification, or related life-insurance event. Always escalated to a licensed life producer.', 0, 11),
      (p_org_id, 'Payment Question', 'Caller asking about premium payments, missed payments, payment methods, autopay, etc.', 0, 12),
      (p_org_id, 'Endorsement or Policy Change', 'Existing client requesting a change to their policy (vehicle add/remove, address change, coverage update, etc.).', 0, 13),
      (p_org_id, 'Cancellation Request', 'Caller is asking to cancel a policy or threatening to leave. Routed to retention/broker.', 0, 14),
      (p_org_id, 'Referral', 'Caller is a referral from an existing client, partner, or another business.', 25, 15);
  END IF;
END;
$function$;
