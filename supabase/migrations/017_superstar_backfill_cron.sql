-- Migration 017: pg_cron schedule for portal-superstar-backfill
--
-- Daily at 08:00 UTC (= 04:00 America/Toronto during EDT, 03:00 during EST).
-- Off-hours for the user. The edge function is idempotent and exits with a
-- "nothing to sync" report when there's no gap, so daily firing is safe.
--
-- Reuses vault.decrypted_secrets (project_url + worker_secret) — same pattern
-- as the Phase B cron jobs (migration 012).

DO $$
BEGIN
  PERFORM cron.unschedule('portal-superstar-backfill-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'portal-superstar-backfill-daily',
  '0 8 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/portal-superstar-backfill',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-worker-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'worker_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now())
  );
  $cron$
);
