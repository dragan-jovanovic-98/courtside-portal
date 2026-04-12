-- Migration 012: pg_cron schedules for Phase B edge functions
--
-- Three scheduled jobs:
--   1. portal-stripe-customer-worker-every-minute — drains the queue
--   2. portal-billing-refresh-usage-hourly — rolls up call minutes for all active orgs
--   3. portal-billing-close-period-daily — closes the cycle for any sub whose anchor day rolled over
--
-- All three reuse the legacy vault secrets (project_url + worker_secret) and the
-- x-worker-secret header auth pattern. The portal edge functions accept this header
-- as a bypass for super_admin-only actions (see portal-billing/auth.ts :: hasWorkerSecret).
--
-- Idempotency: each cron.schedule is preceded by a DO block that tries to unschedule
-- the job first, swallowing "job not found" errors. This makes the migration safe to
-- re-run during development.

-- 1. Customer worker — every minute
DO $$
BEGIN
  PERFORM cron.unschedule('portal-stripe-customer-worker-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'portal-stripe-customer-worker-every-minute',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/portal-stripe-customer-worker',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-worker-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'worker_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now())
  );
  $cron$
);

-- 2. Refresh usage across all active subs — hourly at :00
DO $$
BEGIN
  PERFORM cron.unschedule('portal-billing-refresh-usage-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'portal-billing-refresh-usage-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/portal-billing',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-worker-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'worker_secret')
    ),
    body := jsonb_build_object('action', 'refresh-usage')
  );
  $cron$
);

-- 3. Close period across all active subs — daily at 00:05 UTC.
-- close-period finds any sub whose current cycle start is "today" (i.e. cycle
-- just rolled over at midnight) and computes overage for the cycle that ended.
DO $$
BEGIN
  PERFORM cron.unschedule('portal-billing-close-period-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'portal-billing-close-period-daily',
  '5 0 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/portal-billing',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-worker-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'worker_secret')
    ),
    body := jsonb_build_object('action', 'close-period')
  );
  $cron$
);
