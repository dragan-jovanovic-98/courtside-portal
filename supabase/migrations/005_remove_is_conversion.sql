-- Remove is_conversion column from outcome categories.
-- Conversion metrics are now calculated using close_likelihood weights
-- instead of a binary conversion flag.

ALTER TABLE portal_outcome_categories DROP COLUMN IF EXISTS is_conversion;

-- Update the seed function to remove is_conversion references
CREATE OR REPLACE FUNCTION portal_seed_outcome_categories(p_org_id UUID, p_industry TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Universal defaults
  INSERT INTO portal_outcome_categories (org_id, name, impact_tier, close_likelihood, sort_order) VALUES
    (p_org_id, 'Appointment Booked', 'high', 50, 1),
    (p_org_id, 'Quote Request', 'medium', 20, 2),
    (p_org_id, 'Callback Requested', 'medium', 15, 3),
    (p_org_id, 'Message Taken', 'low', 0, 4),
    (p_org_id, 'Information Provided', 'low', 0, 5),
    (p_org_id, 'Wrong Number', 'low', 0, 6),
    (p_org_id, 'Spam', 'low', 0, 7);

  -- Industry-specific additions
  IF p_industry = 'legal' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, close_likelihood, sort_order) VALUES
      (p_org_id, 'Intake Completed', 'high', 60, 8),
      (p_org_id, 'Consultation Scheduled', 'high', 45, 9);
  ELSIF p_industry = 'medical' OR p_industry = 'dental' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, close_likelihood, sort_order) VALUES
      (p_org_id, 'Patient Scheduled', 'high', 70, 8),
      (p_org_id, 'Prescription Inquiry', 'medium', 5, 9);
  ELSIF p_industry = 'home_services' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, close_likelihood, sort_order) VALUES
      (p_org_id, 'Estimate Scheduled', 'high', 35, 8),
      (p_org_id, 'Emergency Dispatched', 'high', 80, 9);
  ELSIF p_industry = 'sports' OR p_industry = 'recreation' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, close_likelihood, sort_order) VALUES
      (p_org_id, 'Court/Facility Booked', 'high', 90, 8),
      (p_org_id, 'Membership Inquiry', 'medium', 25, 9);
  END IF;
END;
$$ LANGUAGE plpgsql;
