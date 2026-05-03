-- Phase C revision (2026-05-02): the column previously named
-- analysis_function_name held a Supabase function slug under the
-- "ONE shared analyzer" model. Under the data-vs-behavior split,
-- this column is the per-agent n8n webhook URL the Supabase
-- ingestion forwards enriched payloads to.
--
-- See plans/2026-05-02-phase-c-revision-data-vs-behavior-split.md
-- and context/architecture.md for the architecture.
--
-- Operations:
--   1. Drop default + NOT NULL on portal_agents.analysis_function_name
--   2. NULL the stale 'portal-post-call-analysis' values
--   3. Rename to post_call_webhook_url
--   4. Recreate portal_superstar_sync_run RPC from migration 016 with
--      the column dropped from the INSERT (defaults to NULL).
--
-- Pre-flight verified 2026-05-02: no RLS policies, indexes, or views
-- reference the column. All 5 existing rows hold the stale slug.

BEGIN;

-- 1. Drop default + NOT NULL.
ALTER TABLE portal_agents
  ALTER COLUMN analysis_function_name DROP DEFAULT,
  ALTER COLUMN analysis_function_name DROP NOT NULL;

-- 2. NULL stale slug values.
UPDATE portal_agents
SET analysis_function_name = NULL
WHERE analysis_function_name = 'portal-post-call-analysis';

-- 3. Rename column.
ALTER TABLE portal_agents
  RENAME COLUMN analysis_function_name TO post_call_webhook_url;

COMMENT ON COLUMN portal_agents.post_call_webhook_url IS
  'Per-agent n8n webhook URL. portal-retell-webhook forwards the enriched call envelope here after ingestion + agnostic triggers. NULL = no forward (analysis_status set to ''skipped''). Replaces the prior analysis_function_name (Supabase slug) under the 2026-05-02 data-vs-behavior split. See context/architecture.md.';

-- 4. Recreate portal_superstar_sync_run RPC from migration 016.
--    Body is verbatim except for the agents INSERT — analysis_function_name
--    is removed from the column list (defaults to NULL under the new schema).

CREATE OR REPLACE FUNCTION public.portal_superstar_sync_run(p_synced_at text)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  gym_client_id uuid := '432498c3-236a-499c-810c-a0fcb3a69f6f';
  portal_org_id uuid := '6ba33bb9-2c9b-4418-ba9c-986a76efae3d';
  agents_created int := 0;
  calls_inserted int := 0;
BEGIN
  -- 1. Auto-create new portal_agents from gym_agents not yet mirrored
  WITH inserted AS (
    INSERT INTO portal_agents (
      org_id, name, agent_type, direction, status, role,
      llm_provider, llm_model, intake_schema, retell_agent_id
    )
    SELECT
      portal_org_id, ga.name, 'Receptionist', 'inbound', 'active', 'general',
      'openai', 'gpt-4o', '{}'::jsonb, ga.external_agent_id
    FROM gym_agents ga
    WHERE ga.client_id = gym_client_id
      AND NOT EXISTS (
        SELECT 1 FROM portal_agents pa
        WHERE pa.retell_agent_id = ga.external_agent_id
          AND pa.org_id = portal_org_id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO agents_created FROM inserted;

  -- 2. Insert missing portal_calls
  WITH inserted AS (
    INSERT INTO portal_calls (
      org_id, agent_id, direction, status,
      caller_number, to_number, started_at, ended_at, duration_seconds,
      sentiment, ai_summary, transcript, transcript_text, recording_url,
      retell_call_id, analysis_status, metadata
    )
    SELECT
      portal_org_id,
      pa.id,
      (CASE WHEN gc.call_direction = 'outbound' THEN 'outbound' ELSE 'inbound' END)::portal_call_direction,
      (CASE
        WHEN gc.ended_reason = 'call_transfer' THEN 'transferred'
        WHEN gc.ended_reason IN ('inactivity','error_unknown') THEN 'abandoned'
        WHEN gc.call_duration_s IS NULL OR gc.call_duration_s < 1 THEN 'abandoned'
        ELSE 'completed'
      END)::portal_call_status,
      gc.from_phone,
      gc.to_phone,
      COALESCE(gc.start_time, gc.created_at),
      gc.end_time,
      ROUND(gc.call_duration_s)::int,
      CASE LOWER(gc.user_sentiment)
        WHEN 'positive' THEN 'positive'
        WHEN 'neutral' THEN 'neutral'
        WHEN 'negative' THEN 'negative'
        ELSE NULL
      END,
      gc.summary,
      public.parse_gym_transcript(gc.transcript),
      gc.transcript,
      gc.recording_url,
      gc.external_call_id,
      'skipped'::portal_analysis_status,
      jsonb_build_object(
        'external_call_id', gc.external_call_id,
        'external_agent_id', gc.external_agent_id,
        'ended_reason', gc.ended_reason,
        'call_success', gc.call_success,
        'call_disposition', gc.call_disposition,
        'source', 'gym_pipeline_sync',
        'synced_at', p_synced_at
      )
    FROM gym_call_logs gc
    LEFT JOIN portal_agents pa
      ON pa.retell_agent_id = gc.external_agent_id
     AND pa.org_id = portal_org_id
    WHERE gc.client_id = gym_client_id
      AND NOT EXISTS (
        SELECT 1 FROM portal_calls pc
        WHERE pc.org_id = portal_org_id
          AND pc.metadata->>'external_call_id' = gc.external_call_id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO calls_inserted FROM inserted;

  RETURN jsonb_build_object(
    'agents_created', agents_created,
    'calls_inserted', calls_inserted
  );
END;
$$;

COMMIT;
