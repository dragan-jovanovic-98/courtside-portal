-- Add optional description field to outcome categories.
-- Used by AI for post-call analysis classification criteria.

ALTER TABLE portal_outcome_categories
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
