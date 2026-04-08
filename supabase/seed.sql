-- Court Side AI Client Portal — Seed Data
-- Demo organization: Ace Sports Complex (sports industry)

-- NOTE: auth.users entries must be created via Supabase Auth (UI or API).
-- This seed assumes two auth users exist. Replace these UUIDs after creating them.
-- Demo Owner: demo-owner@courtsideai.com / password123
-- Demo Member: demo-member@courtsideai.com / password123

DO $$
DECLARE
  v_org_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_auth_id UUID := '00000000-0000-0000-0000-000000000001'; -- Replace after auth user creation
  v_member_auth_id UUID := '00000000-0000-0000-0000-000000000002'; -- Replace after auth user creation
  v_owner_id UUID := 'u1000000-0000-0000-0000-000000000001';
  v_member_id UUID := 'u2000000-0000-0000-0000-000000000002';
  v_agent1_id UUID := 'ag100000-0000-0000-0000-000000000001';
  v_agent2_id UUID := 'ag200000-0000-0000-0000-000000000002';
  v_phone1_id UUID := 'ph100000-0000-0000-0000-000000000001';
  v_phone2_id UUID := 'ph200000-0000-0000-0000-000000000002';
  v_oc_booked UUID;
  v_oc_court UUID;
  v_oc_membership UUID;
  v_oc_quote UUID;
  v_oc_callback UUID;
  v_oc_message UUID;
  v_oc_info UUID;
  v_oc_wrong UUID;
  v_oc_spam UUID;
  v_call_id UUID;
  v_contact_id UUID;
  v_i INTEGER;
  v_outcomes UUID[];
  v_outcome UUID;
  v_sentiments TEXT[] := ARRAY['positive', 'neutral', 'negative'];
  v_statuses portal_call_status[] := ARRAY['completed', 'completed', 'completed', 'completed', 'missed', 'voicemail']::portal_call_status[];
  v_engagement TEXT[] := ARRAY['high', 'high', 'medium', 'medium', 'low', 'disengaged'];
  v_names TEXT[] := ARRAY['Sarah Johnson', 'Mike Chen', 'Emily Davis', 'James Wilson', 'Maria Garcia', 'Robert Taylor', 'Lisa Anderson', 'David Martinez', 'Jennifer Brown', 'Chris Lee', 'Amanda White', 'Kevin Harris', 'Rachel Clark', 'Tom Robinson', 'Nicole Wright', 'Brian King'];
  v_phones TEXT[] := ARRAY['+14165551001', '+14165551002', '+14165551003', '+14165551004', '+14165551005', '+14165551006', '+14165551007', '+14165551008', '+14165551009', '+14165551010', '+14165551011', '+14165551012', '+14165551013', '+14165551014', '+14165551015', '+14165551016'];
  v_services TEXT[] := ARRAY['Pickleball Court', 'Tennis Court', 'Golf Simulator', 'Batting Cage', 'Court Rental', 'Group Lesson', 'Private Lesson', 'Birthday Party'];
  v_started TIMESTAMPTZ;
  v_duration INTEGER;
  v_rand DOUBLE PRECISION;
BEGIN

  -- Organization
  INSERT INTO portal_organizations (id, name, slug, industry, business_type, business_phone, website, address, country, timezone, primary_email, billing_email, conversion_metric_label, average_order_value)
  VALUES (
    v_org_id, 'Ace Sports Complex', 'ace-sports', 'sports', 'llc',
    '+14165550100', 'https://acesportscomplex.com', '123 Court Street, Toronto, ON M5V 1A1', 'CA',
    'America/Toronto', 'info@acesportscomplex.com', 'billing@acesportscomplex.com',
    'Courts Booked', 75
  );

  -- Users
  INSERT INTO portal_users (id, auth_id, org_id, first_name, last_name, email, role)
  VALUES
    (v_owner_id, v_owner_auth_id, v_org_id, 'Dragan', 'Demo', 'demo-owner@courtsideai.com', 'owner'),
    (v_member_id, v_member_auth_id, v_org_id, 'Alex', 'Staff', 'demo-member@courtsideai.com', 'member');

  -- Phone Numbers
  INSERT INTO portal_phone_numbers (id, org_id, number, friendly_name, type) VALUES
    (v_phone1_id, v_org_id, '+14165550101', 'Main Line', 'inbound'),
    (v_phone2_id, v_org_id, '+14165550102', 'After Hours', 'inbound');

  -- Agents
  INSERT INTO portal_agents (id, org_id, name, agent_type, direction, status, phone_number_id, llm_provider, llm_model, voice_gender, purpose_description, preferred_greeting)
  VALUES
    (v_agent1_id, v_org_id, 'Receptionist @ Main Office', 'Receptionist', 'inbound', 'active', v_phone1_id, 'openai', 'gpt-4o', 'Female',
     'Handles booking inquiries, court reservations, general questions, and membership info during business hours.',
     'Hi, thanks for calling Ace Sports Complex! How can I help you today?'),
    (v_agent2_id, v_org_id, 'Intake @ After Hours', 'Intake', 'inbound', 'active', v_phone2_id, 'openai', 'gpt-4o', 'Male',
     'Takes messages, handles urgent inquiries, and books appointments for the next business day during after hours.',
     'Hi, you''ve reached Ace Sports Complex after hours. I can help you book a court or take a message.');

  -- Update phone numbers with agent FK
  UPDATE portal_phone_numbers SET agent_id = v_agent1_id WHERE id = v_phone1_id;
  UPDATE portal_phone_numbers SET agent_id = v_agent2_id WHERE id = v_phone2_id;

  -- Seed outcome categories
  PERFORM portal_seed_outcome_categories(v_org_id, 'sports');

  -- Get outcome category IDs
  SELECT id INTO v_oc_booked FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Appointment Booked';
  SELECT id INTO v_oc_court FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Court/Facility Booked';
  SELECT id INTO v_oc_membership FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Membership Inquiry';
  SELECT id INTO v_oc_quote FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Quote Request';
  SELECT id INTO v_oc_callback FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Callback Requested';
  SELECT id INTO v_oc_message FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Message Taken';
  SELECT id INTO v_oc_info FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Information Provided';
  SELECT id INTO v_oc_wrong FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Wrong Number';
  SELECT id INTO v_oc_spam FROM portal_outcome_categories WHERE org_id = v_org_id AND name = 'Spam';

  v_outcomes := ARRAY[v_oc_court, v_oc_court, v_oc_court, v_oc_booked, v_oc_booked, v_oc_membership, v_oc_quote, v_oc_callback, v_oc_message, v_oc_info, v_oc_wrong, v_oc_spam];

  -- Generate 55 demo calls over the past 30 days
  FOR v_i IN 1..55 LOOP
    v_rand := random();
    v_started := NOW() - (random() * INTERVAL '30 days');
    v_duration := (30 + random() * 570)::INTEGER; -- 30s to 10min
    v_outcome := v_outcomes[1 + (random() * (array_length(v_outcomes, 1) - 1))::INTEGER];
    v_call_id := gen_random_uuid();

    INSERT INTO portal_calls (
      id, org_id, agent_id, direction, status, outcome_category_id,
      caller_number, caller_name, started_at, ended_at, duration_seconds,
      sentiment, sentiment_score, engagement_level, outcome_confidence,
      ai_summary, summary_one_line
    ) VALUES (
      v_call_id, v_org_id,
      CASE WHEN random() > 0.3 THEN v_agent1_id ELSE v_agent2_id END,
      'inbound',
      v_statuses[1 + (random() * (array_length(v_statuses, 1) - 1))::INTEGER],
      v_outcome,
      v_phones[1 + (v_i % array_length(v_phones, 1))],
      v_names[1 + (v_i % array_length(v_names, 1))],
      v_started,
      v_started + (v_duration || ' seconds')::INTERVAL,
      v_duration,
      v_sentiments[1 + (random() * 2)::INTEGER],
      (random() * 2 - 1)::NUMERIC(3,2),
      v_engagement[1 + (random() * (array_length(v_engagement, 1) - 1))::INTEGER],
      (0.5 + random() * 0.5)::NUMERIC(3,2),
      'Caller inquired about ' || v_services[1 + (random() * (array_length(v_services, 1) - 1))::INTEGER] || ' availability. Agent provided information and assisted with booking.',
      v_names[1 + (v_i % array_length(v_names, 1))] || ' called about ' || v_services[1 + (random() * (array_length(v_services, 1) - 1))::INTEGER]
    );

    -- Add some call actions for booked outcomes
    IF v_outcome = v_oc_court OR v_outcome = v_oc_booked THEN
      INSERT INTO portal_call_actions (call_id, org_id, tool_name, input, output, duration_ms)
      VALUES (
        v_call_id, v_org_id, 'book_appointment',
        jsonb_build_object('service', v_services[1 + (random() * (array_length(v_services, 1) - 1))::INTEGER], 'date', (NOW() + (random() * INTERVAL '14 days'))::DATE::TEXT),
        jsonb_build_object('status', 'confirmed', 'booking_id', gen_random_uuid()::TEXT),
        (200 + random() * 800)::INTEGER
      );
    END IF;
  END LOOP;

  -- Generate 12 demo bookings
  FOR v_i IN 1..12 LOOP
    INSERT INTO portal_bookings (
      org_id, agent_id, title, service_type,
      scheduled_at, duration_minutes, status, notes, sync_status
    ) VALUES (
      v_org_id,
      CASE WHEN random() > 0.3 THEN v_agent1_id ELSE v_agent2_id END,
      v_names[1 + (v_i % array_length(v_names, 1))] || ' — ' || v_services[1 + (v_i % array_length(v_services, 1))],
      v_services[1 + (v_i % array_length(v_services, 1))],
      NOW() + ((v_i - 3) * INTERVAL '2 days') + INTERVAL '10 hours',
      CASE WHEN random() > 0.5 THEN 60 ELSE 30 END,
      CASE
        WHEN v_i <= 3 THEN 'completed'::portal_booking_status
        WHEN v_i <= 5 THEN 'confirmed'::portal_booking_status
        WHEN v_i = 6 THEN 'cancelled'::portal_booking_status
        ELSE 'scheduled'::portal_booking_status
      END,
      'Booked via AI agent',
      'not_applicable'
    );
  END LOOP;

  -- Subscription
  INSERT INTO portal_subscriptions (org_id, plan_name, price_monthly, call_minutes_limit, call_minutes_used, phone_numbers_limit, phone_numbers_used, status, current_period_start, current_period_end)
  VALUES (v_org_id, 'Growth', 599, 500, 342, 3, 2, 'active', date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month');

  -- Compliance settings
  INSERT INTO portal_compliance_settings (org_id) VALUES (v_org_id);

  -- Notification preferences
  INSERT INTO portal_notification_preferences (user_id, preferences)
  VALUES (
    v_owner_id,
    '{"missed_call_email": true, "daily_summary": true, "weekly_report": true}'::JSONB
  );

END $$;
