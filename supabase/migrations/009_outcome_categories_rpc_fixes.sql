-- Outcome categories RPC fixes.
--
-- 1. COALESCE the auth check so a NULL role cannot silently bypass it.
--    Previously portal_user_role_in_org() returned NULL for a caller who
--    had no membership row in the target org, NULL IN (...) yielded NULL,
--    NOT NULL yielded NULL, and PLpgSQL treats a NULL IF condition as false
--    — so the exception was never raised. Combined with GRANT EXECUTE TO
--    authenticated, any logged-in user could rewrite any org's categories
--    or reassign its calls via a direct PostgREST call.
--
-- 2. Validate close_likelihood is an integer in 0..100 (was only enforced
--    via the HTML input min/max, which is client-bypassable).

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

    cat_impact_tier := cat->>'impact_tier';
    IF cat_impact_tier NOT IN ('high', 'medium', 'low') THEN
      RAISE EXCEPTION 'impact_tier must be one of: high, medium, low (got %)', cat_impact_tier;
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
        impact_tier = cat_impact_tier,
        color = nullif(cat->>'color', ''),
        sort_order = (cat->>'sort_order')::INTEGER,
        close_likelihood = cat_close_likelihood
      WHERE id = cat_id AND org_id = p_org_id;
    ELSE
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
  SELECT org_id INTO v_org_id
  FROM portal_outcome_categories
  WHERE id = p_category_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Outcome category not found';
  END IF;

  IF NOT COALESCE(
    portal_user_role_in_org(v_org_id) IN ('owner', 'admin')
    OR portal_is_super_admin(),
    false
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be owner or admin of this organization';
  END IF;

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

  UPDATE portal_calls
  SET outcome_category_id = p_replacement_id
  WHERE outcome_category_id = p_category_id;

  GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;

  DELETE FROM portal_outcome_categories WHERE id = p_category_id;

  RETURN v_reassigned_count;
END;
$$;
