-- Remove the impact_tier column from portal_outcome_categories.
--
-- Rationale: impact_tier was a legacy grouping (high/medium/low) that served
-- only as a fallback color source for the dashboard outcomes chart. Every
-- category already carries an explicit `color`, so the fallback branch was
-- unreachable in practice. The field was not used in any calculation,
-- filter, sort, or user-visible label. close_likelihood is the field that
-- actually drives revenue estimation (dashboard/actions.ts).
--
-- Dropping the column simplifies the UI (fewer controls in the category
-- row, which was also causing a mobile layout squish), the types, and the
-- mental model for users who had to guess what tier meant on top of
-- close_likelihood.

-- 1. Drop the column. CASCADE is unnecessary — nothing references it.
ALTER TABLE portal_outcome_categories DROP COLUMN IF EXISTS impact_tier;

-- 2. Replace seed_default_outcome_categories so fresh orgs no longer try to
--    insert impact_tier. Signature matches the previous definition in
--    migrations 003/005.
CREATE OR REPLACE FUNCTION seed_default_outcome_categories(
  p_org_id UUID,
  p_industry TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Universal defaults
  INSERT INTO portal_outcome_categories (org_id, name, close_likelihood, sort_order) VALUES
    (p_org_id, 'Appointment Booked', 50, 1),
    (p_org_id, 'Quote Request', 20, 2),
    (p_org_id, 'Callback Requested', 15, 3),
    (p_org_id, 'General Inquiry', 5, 4),
    (p_org_id, 'Not Interested', 0, 5),
    (p_org_id, 'Spam', 0, 6),
    (p_org_id, 'Wrong Number', 0, 7);

  -- Industry-specific additions
  IF p_industry = 'legal' THEN
    INSERT INTO portal_outcome_categories (org_id, name, close_likelihood, sort_order) VALUES
      (p_org_id, 'Intake Completed', 60, 8),
      (p_org_id, 'Consultation Scheduled', 45, 9);
  ELSIF p_industry = 'medical' OR p_industry = 'dental' THEN
    INSERT INTO portal_outcome_categories (org_id, name, close_likelihood, sort_order) VALUES
      (p_org_id, 'Patient Scheduled', 70, 8),
      (p_org_id, 'Prescription Inquiry', 5, 9);
  ELSIF p_industry = 'home_services' THEN
    INSERT INTO portal_outcome_categories (org_id, name, close_likelihood, sort_order) VALUES
      (p_org_id, 'Estimate Scheduled', 35, 8),
      (p_org_id, 'Emergency Dispatched', 80, 9);
  ELSIF p_industry = 'sports' OR p_industry = 'recreation' THEN
    INSERT INTO portal_outcome_categories (org_id, name, close_likelihood, sort_order) VALUES
      (p_org_id, 'Court/Facility Booked', 90, 8),
      (p_org_id, 'Membership Inquiry', 25, 9);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace portal_update_outcome_categories so the RPC no longer reads or
--    validates impact_tier from incoming JSON. Preserves the 0..100
--    close_likelihood check and the owner/admin/super_admin auth gate from
--    migration 009.
CREATE OR REPLACE FUNCTION portal_update_outcome_categories(
  p_org_id UUID,
  p_categories JSONB
)
RETURNS SETOF portal_outcome_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat JSONB;
  cat_id UUID;
  cat_name TEXT;
  cat_close_likelihood INTEGER;
BEGIN
  IF NOT COALESCE(
    portal_user_role_in_org(p_org_id) IN ('owner', 'admin')
    OR portal_is_super_admin(),
    false
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be owner or admin of this organization';
  END IF;

  IF jsonb_typeof(p_categories) <> 'array' THEN
    RAISE EXCEPTION 'p_categories must be a JSON array';
  END IF;

  FOR cat IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    cat_name := trim(cat->>'name');
    IF cat_name IS NULL OR cat_name = '' THEN
      RAISE EXCEPTION 'Category name cannot be empty';
    END IF;

    cat_close_likelihood := (cat->>'close_likelihood')::INTEGER;
    IF cat_close_likelihood IS NULL OR cat_close_likelihood NOT BETWEEN 0 AND 100 THEN
      RAISE EXCEPTION 'close_likelihood must be an integer between 0 and 100 (got %)', cat->>'close_likelihood';
    END IF;

    cat_id := nullif(cat->>'id', '')::UUID;

    IF cat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM portal_outcome_categories
      WHERE id = cat_id AND org_id = p_org_id
    ) THEN
      UPDATE portal_outcome_categories
      SET
        name = cat_name,
        description = nullif(cat->>'description', ''),
        color = nullif(cat->>'color', ''),
        sort_order = (cat->>'sort_order')::INTEGER,
        close_likelihood = cat_close_likelihood
      WHERE id = cat_id AND org_id = p_org_id;
    ELSE
      INSERT INTO portal_outcome_categories (
        org_id, name, description, color, sort_order, close_likelihood
      )
      VALUES (
        p_org_id,
        cat_name,
        nullif(cat->>'description', ''),
        nullif(cat->>'color', ''),
        (cat->>'sort_order')::INTEGER,
        cat_close_likelihood
      );
    END IF;
  END LOOP;

  RETURN QUERY
    SELECT * FROM portal_outcome_categories
    WHERE org_id = p_org_id
    ORDER BY sort_order;
END;
$$;
