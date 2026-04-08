-- Court Side AI Client Portal — Database Functions and Triggers

-- ==========================================
-- Auto-update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION portal_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_portal_organizations_updated_at
  BEFORE UPDATE ON portal_organizations
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_users_updated_at
  BEFORE UPDATE ON portal_users
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_agents_updated_at
  BEFORE UPDATE ON portal_agents
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_contacts_updated_at
  BEFORE UPDATE ON portal_contacts
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_bookings_updated_at
  BEFORE UPDATE ON portal_bookings
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_subscriptions_updated_at
  BEFORE UPDATE ON portal_subscriptions
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_compliance_updated_at
  BEFORE UPDATE ON portal_compliance_settings
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_verification_updated_at
  BEFORE UPDATE ON portal_verification
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_notification_prefs_updated_at
  BEFORE UPDATE ON portal_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

CREATE TRIGGER trg_portal_calendar_connections_updated_at
  BEFORE UPDATE ON portal_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION portal_update_updated_at();

-- ==========================================
-- Calculate is_after_hours on call insert
-- ==========================================
CREATE OR REPLACE FUNCTION portal_calculate_after_hours()
RETURNS TRIGGER AS $$
DECLARE
  org_tz TEXT;
  org_hours JSONB;
  call_local TIMESTAMPTZ;
  call_time TIME;
  call_dow INTEGER;
  rule JSONB;
  is_within_hours BOOLEAN := false;
BEGIN
  SELECT timezone, business_hours INTO org_tz, org_hours
  FROM portal_organizations WHERE id = NEW.org_id;

  IF org_tz IS NULL THEN org_tz := 'America/New_York'; END IF;

  call_local := NEW.started_at AT TIME ZONE org_tz;
  call_time := call_local::TIME;
  call_dow := EXTRACT(ISODOW FROM call_local)::INTEGER; -- 1=Mon, 7=Sun

  IF org_hours IS NOT NULL AND org_hours->'rules' IS NOT NULL THEN
    FOR rule IN SELECT * FROM jsonb_array_elements(org_hours->'rules')
    LOOP
      IF call_dow = ANY(ARRAY(SELECT jsonb_array_elements_text(rule->'days')::INTEGER))
         AND call_time >= (rule->>'start')::TIME
         AND call_time < (rule->>'end')::TIME
      THEN
        is_within_hours := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  NEW.is_after_hours := NOT is_within_hours;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portal_calls_after_hours
  BEFORE INSERT ON portal_calls
  FOR EACH ROW EXECUTE FUNCTION portal_calculate_after_hours();

-- ==========================================
-- Update agent counters on call insert
-- ==========================================
CREATE OR REPLACE FUNCTION portal_update_agent_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    UPDATE portal_agents
    SET
      total_calls = total_calls + 1,
      updated_at = NOW()
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portal_calls_agent_counters
  AFTER INSERT ON portal_calls
  FOR EACH ROW EXECUTE FUNCTION portal_update_agent_counters();

-- ==========================================
-- Upsert contact from call
-- ==========================================
CREATE OR REPLACE FUNCTION portal_upsert_contact_from_call()
RETURNS TRIGGER AS $$
DECLARE
  existing_contact_id UUID;
BEGIN
  IF NEW.caller_number IS NULL OR NEW.caller_number = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_contact_id
  FROM portal_contacts
  WHERE org_id = NEW.org_id AND phone_number = NEW.caller_number;

  IF existing_contact_id IS NOT NULL THEN
    UPDATE portal_contacts
    SET
      total_calls = total_calls + 1,
      last_call_at = NEW.started_at,
      first_name = COALESCE(NEW.caller_name, first_name)
    WHERE id = existing_contact_id;

    NEW.contact_id := existing_contact_id;
  ELSE
    INSERT INTO portal_contacts (org_id, phone_number, first_name, first_call_id, last_call_at)
    VALUES (NEW.org_id, NEW.caller_number, NEW.caller_name, NEW.id, NEW.started_at)
    RETURNING id INTO existing_contact_id;

    NEW.contact_id := existing_contact_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portal_calls_upsert_contact
  BEFORE INSERT ON portal_calls
  FOR EACH ROW EXECUTE FUNCTION portal_upsert_contact_from_call();

-- ==========================================
-- Seed outcome categories by industry
-- ==========================================
CREATE OR REPLACE FUNCTION portal_seed_outcome_categories(p_org_id UUID, p_industry TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Universal defaults
  INSERT INTO portal_outcome_categories (org_id, name, impact_tier, is_conversion, close_likelihood, sort_order) VALUES
    (p_org_id, 'Appointment Booked', 'high', true, 50, 1),
    (p_org_id, 'Quote Request', 'medium', false, 20, 2),
    (p_org_id, 'Callback Requested', 'medium', false, 15, 3),
    (p_org_id, 'Message Taken', 'low', false, 0, 4),
    (p_org_id, 'Information Provided', 'low', false, 0, 5),
    (p_org_id, 'Wrong Number', 'low', false, 0, 6),
    (p_org_id, 'Spam', 'low', false, 0, 7);

  -- Industry-specific additions
  IF p_industry = 'legal' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, is_conversion, close_likelihood, sort_order) VALUES
      (p_org_id, 'Intake Completed', 'high', true, 60, 8),
      (p_org_id, 'Consultation Scheduled', 'high', false, 45, 9);
  ELSIF p_industry = 'medical' OR p_industry = 'dental' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, is_conversion, close_likelihood, sort_order) VALUES
      (p_org_id, 'Patient Scheduled', 'high', true, 70, 8),
      (p_org_id, 'Prescription Inquiry', 'medium', false, 5, 9);
  ELSIF p_industry = 'home_services' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, is_conversion, close_likelihood, sort_order) VALUES
      (p_org_id, 'Estimate Scheduled', 'high', true, 35, 8),
      (p_org_id, 'Emergency Dispatched', 'high', false, 80, 9);
  ELSIF p_industry = 'sports' OR p_industry = 'recreation' THEN
    INSERT INTO portal_outcome_categories (org_id, name, impact_tier, is_conversion, close_likelihood, sort_order) VALUES
      (p_org_id, 'Court/Facility Booked', 'high', true, 90, 8),
      (p_org_id, 'Membership Inquiry', 'medium', false, 25, 9);
  END IF;
END;
$$ LANGUAGE plpgsql;
