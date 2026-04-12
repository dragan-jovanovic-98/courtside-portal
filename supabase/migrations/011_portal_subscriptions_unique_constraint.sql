-- Migration 011: Fix ON CONFLICT target on portal_subscriptions
--
-- The partial unique index from migration 010 (idx_portal_subscriptions_stripe_sub_id
-- WHERE stripe_subscription_id IS NOT NULL) is not a valid ON CONFLICT target for
-- upserts in Postgres — you need either a regular unique constraint or a full
-- unique index. This broke the portal-stripe-webhook handler for
-- customer.subscription.created/updated events with error:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Replace the partial index with a regular unique constraint. Nullable columns
-- in Postgres unique constraints treat each NULL as distinct by default, so
-- multiple NULL stripe_subscription_id values are still allowed (preserving
-- the original intent of the partial index while making it a valid ON CONFLICT
-- target).

DROP INDEX IF EXISTS idx_portal_subscriptions_stripe_sub_id;

ALTER TABLE portal_subscriptions
  ADD CONSTRAINT portal_subscriptions_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);
