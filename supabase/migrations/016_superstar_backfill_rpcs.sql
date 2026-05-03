-- Superstar Courts gym → portal sync RPCs
--
-- Powers the portal-superstar-backfill edge function. Two RPCs encapsulate the
-- SQL portion of the sync (status + run). The edge function calls them in
-- sequence, then handles classification (OpenAI) inline.
--
-- Hardcoded location IDs match the only gym → portal pair we sync today.
-- To add a future location, generalize these to take p_gym_client_id and
-- p_portal_org_id parameters.

-- ============================================================
-- Transcript parser (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION public.parse_gym_transcript(t text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  parts text[];
  result jsonb := '[]'::jsonb;
  i int;
  role text;
  content text;
BEGIN
  IF t IS NULL OR length(trim(t)) = 0 THEN RETURN NULL; END IF;
  parts := regexp_split_to_array(t, E'\\n(?=(?:Agent|User):)');
  FOR i IN 1..coalesce(array_length(parts, 1), 0) LOOP
    IF parts[i] ~* '^Agent:' THEN
      role := 'agent';
      content := trim(regexp_replace(parts[i], '^Agent:[[:space:]]*', ''));
    ELSIF parts[i] ~* '^User:' THEN
      role := 'caller';
      content := trim(regexp_replace(parts[i], '^User:[[:space:]]*', ''));
    ELSE
      CONTINUE;
    END IF;
    IF length(content) > 0 THEN
      result := result || jsonb_build_array(jsonb_build_object('role', role, 'content', content, 'timestamp', ''));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================
-- Sync status (read-only)
--
-- Returns: { gap_size, mystery_agents, new_agents_to_create }
-- ============================================================

CREATE OR REPLACE FUNCTION public.portal_superstar_sync_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
DECLARE
  gym_client_id uuid := '432498c3-236a-499c-810c-a0fcb3a69f6f';
  portal_org_id uuid := '6ba33bb9-2c9b-4418-ba9c-986a76efae3d';
BEGIN
  RETURN (
    WITH missing AS (
      SELECT g.* FROM gym_call_logs g
      WHERE g.client_id = gym_client_id
        AND NOT EXISTS (
          SELECT 1 FROM portal_calls pc
          WHERE pc.org_id = portal_org_id
            AND pc.metadata->>'external_call_id' = g.external_call_id
        )
    ),
    mystery AS (
      SELECT DISTINCT m.external_agent_id
      FROM missing m
      WHERE m.external_agent_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM gym_agents ga
          WHERE ga.external_agent_id = m.external_agent_id
            AND ga.client_id = gym_client_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM portal_agents pa
          WHERE pa.retell_agent_id = m.external_agent_id
            AND pa.org_id = portal_org_id
        )
    ),
    new_agents AS (
      SELECT ga.external_agent_id, ga.name
      FROM gym_agents ga
      WHERE ga.client_id = gym_client_id
        AND NOT EXISTS (
          SELECT 1 FROM portal_agents pa
          WHERE pa.retell_agent_id = ga.external_agent_id
            AND pa.org_id = portal_org_id
        )
    )
    SELECT jsonb_build_object(
      'gap_size', (SELECT COUNT(*) FROM missing),
      'mystery_agents', COALESCE((SELECT jsonb_agg(external_agent_id) FROM mystery), '[]'::jsonb),
      'new_agents_to_create', COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('external_agent_id', external_agent_id, 'name', name)) FROM new_agents),
        '[]'::jsonb
      )
    )
  );
END;
$$;

-- ============================================================
-- Sync run (writes)
--
-- 1. Auto-creates portal_agents for any gym_agents not yet mirrored.
-- 2. Inserts gym_call_logs rows that don't yet have a portal_calls counterpart,
--    using the locked mapping rules.
-- Returns: { agents_created, calls_inserted }
-- ============================================================

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
      llm_provider, llm_model, analysis_function_name, intake_schema, retell_agent_id
    )
    SELECT
      portal_org_id, ga.name, 'Receptionist', 'inbound', 'active', 'general',
      'openai', 'gpt-4o', 'portal-post-call-analysis', '{}'::jsonb, ga.external_agent_id
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
