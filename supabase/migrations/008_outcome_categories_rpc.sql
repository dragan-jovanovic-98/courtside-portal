-- Outcome categories: safe diff-based update + reassignment-aware delete.
--
-- Background: the previous client-side save handler did
-- DELETE FROM portal_outcome_categories WHERE org_id = X
-- followed by a fresh INSERT. The DELETE cascaded ON DELETE SET NULL onto
-- portal_calls.outcome_category_id, severing every call → outcome relationship
-- on every save. The new INSERT generated fresh UUIDs that orphaned calls could
-- never reference again.
--
-- These two functions move the save logic into atomic, role-checked Postgres
-- procedures so the bug cannot reoccur:
--
--   1. portal_update_outcome_categories(p_org_id, p_categories)
--      Diff-based UPSERT inside a single transaction. UPDATEs existing rows by
--      id (preserving the UUID) and INSERTs rows whose id is null/missing.
--      It REFUSES to delete rows in the diff — if the client omits a category,
--      nothing happens to it. Deletion must go through the dedicated function
--      below so calls are reassigned first.
--
--   2. portal_delete_outcome_category_with_reassignment(p_category_id, p_replacement_id)
--      Atomic reassign-then-delete. Moves every portal_calls row from the old
--      category to the replacement, then deletes the old category. Both rows
--      must belong to the same org. The replacement may be NULL only if the
--      caller is explicitly choosing to NULL the calls.

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
  cat_impact_tier TEXT;
BEGIN
  -- Authorization: caller must be owner or admin in this org (or super_admin)
  IF NOT (
    portal_user_role_in_org(p_org_id) IN ('owner', 'admin')
    OR portal_is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be owner or admin of this organization';
  END IF;

  IF jsonb_typeof(p_categories) <> 'array' THEN
    RAISE EXCEPTION 'p_categories must be a JSON array';
  END IF;

  -- Iterate the input array. Each element may have an `id` (existing row) or
  -- omit it (new row). We never delete rows the client failed to mention.
  FOR cat IN SELECT * FROM jsonb_array_elements(p_categories)
  LOOP
    cat_name := trim(cat->>'name');
    IF cat_name IS NULL OR cat_name = '' THEN
      RAISE EXCEPTION 'Category name cannot be empty';
    END IF;

    cat_impact_tier := cat->>'impact_tier';
    IF cat_impact_tier NOT IN ('high', 'medium', 'low') THEN
      RAISE EXCEPTION 'impact_tier must be one of: high, medium, low (got %)', cat_impact_tier;
    END IF;

    -- Coerce the id field. nullif handles JSON null, missing, and empty string.
    cat_id := nullif(cat->>'id', '')::UUID;

    IF cat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM portal_outcome_categories
      WHERE id = cat_id AND org_id = p_org_id
    ) THEN
      -- Existing row → UPDATE in place, preserving the UUID so portal_calls FKs survive.
      UPDATE portal_outcome_categories
      SET
        name = cat_name,
        description = nullif(cat->>'description', ''),
        impact_tier = cat_impact_tier,
        color = nullif(cat->>'color', ''),
        sort_order = (cat->>'sort_order')::INTEGER,
        close_likelihood = (cat->>'close_likelihood')::INTEGER
      WHERE id = cat_id AND org_id = p_org_id;
    ELSE
      -- New row → INSERT, let Postgres generate a fresh UUID.
      INSERT INTO portal_outcome_categories (
        org_id, name, description, impact_tier, color, sort_order, close_likelihood
      )
      VALUES (
        p_org_id,
        cat_name,
        nullif(cat->>'description', ''),
        cat_impact_tier,
        nullif(cat->>'color', ''),
        (cat->>'sort_order')::INTEGER,
        (cat->>'close_likelihood')::INTEGER
      );
    END IF;
  END LOOP;

  RETURN QUERY
    SELECT * FROM portal_outcome_categories
    WHERE org_id = p_org_id
    ORDER BY sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION portal_update_outcome_categories(UUID, JSONB) TO authenticated;


CREATE OR REPLACE FUNCTION portal_delete_outcome_category_with_reassignment(
  p_category_id UUID,
  p_replacement_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_replacement_org_id UUID;
  v_reassigned_count INTEGER;
BEGIN
  -- Look up the category being deleted and capture its org for the auth check.
  SELECT org_id INTO v_org_id
  FROM portal_outcome_categories
  WHERE id = p_category_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Outcome category not found';
  END IF;

  -- Authorization: caller must be owner/admin in the category's org.
  IF NOT (
    portal_user_role_in_org(v_org_id) IN ('owner', 'admin')
    OR portal_is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be owner or admin of this organization';
  END IF;

  -- Replacement category must belong to the same org (or be NULL — explicit opt-in to NULL).
  IF p_replacement_id IS NOT NULL THEN
    IF p_replacement_id = p_category_id THEN
      RAISE EXCEPTION 'Replacement category cannot be the category being deleted';
    END IF;

    SELECT org_id INTO v_replacement_org_id
    FROM portal_outcome_categories
    WHERE id = p_replacement_id;

    IF v_replacement_org_id IS NULL THEN
      RAISE EXCEPTION 'Replacement category not found';
    END IF;

    IF v_replacement_org_id <> v_org_id THEN
      RAISE EXCEPTION 'Replacement category must belong to the same organization';
    END IF;
  END IF;

  -- Reassign every call that pointed to the old category. If p_replacement_id
  -- is NULL, the call's outcome_category_id becomes NULL — same effect the
  -- ON DELETE SET NULL cascade would have produced, but explicit and
  -- pre-counted so the caller knows what happened.
  UPDATE portal_calls
  SET outcome_category_id = p_replacement_id
  WHERE outcome_category_id = p_category_id;

  GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;

  -- Now safe to drop the category. The FK has nothing left to cascade.
  DELETE FROM portal_outcome_categories WHERE id = p_category_id;

  RETURN v_reassigned_count;
END;
$$;

GRANT EXECUTE ON FUNCTION portal_delete_outcome_category_with_reassignment(UUID, UUID) TO authenticated;
