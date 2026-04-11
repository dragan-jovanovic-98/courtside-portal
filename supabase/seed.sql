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
  v_service TEXT;
  v_caller_name TEXT;
  v_transcript JSONB;
  v_transcript_text TEXT;
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
    v_service := v_services[1 + (random() * (array_length(v_services, 1) - 1))::INTEGER];
    v_caller_name := v_names[1 + (v_i % array_length(v_names, 1))];

    -- Build a synthetic transcript appropriate to the outcome. Variants:
    --   Booked (court/appointment): 8 entries, full-book dialogue
    --   Engaged (membership/quote/callback/info/message): 5-6 entries
    --   Dropped (wrong number/spam): 2 short entries
    IF v_outcome = v_oc_court OR v_outcome = v_oc_booked THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Hi, I''d like to book a ' || v_service || ' for this weekend.', 'timestamp', '00:07'),
        jsonb_build_object('role', 'agent', 'content', 'Absolutely, what day and time works best for you?', 'timestamp', '00:13'),
        jsonb_build_object('role', 'caller', 'content', 'Saturday around 3pm if you have anything available.', 'timestamp', '00:18'),
        jsonb_build_object('role', 'agent', 'content', 'Let me check. I have a slot at 3pm for 60 minutes. Should I go ahead and book it?', 'timestamp', '00:26'),
        jsonb_build_object('role', 'caller', 'content', 'Yes, please. Can I get a confirmation by text?', 'timestamp', '00:32'),
        jsonb_build_object('role', 'agent', 'content', 'Of course. You''ll get a confirmation text at this number in just a moment. Anything else I can help with?', 'timestamp', '00:40'),
        jsonb_build_object('role', 'caller', 'content', 'No, that''s all. Thanks so much!', 'timestamp', '00:46')
      );
    ELSIF v_outcome = v_oc_membership THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'I''m interested in becoming a member. Can you tell me about your plans?', 'timestamp', '00:08'),
        jsonb_build_object('role', 'agent', 'content', 'Sure. We have monthly and annual plans, with discounts on court bookings, group lessons, and events. Do you have a preference?', 'timestamp', '00:18'),
        jsonb_build_object('role', 'caller', 'content', 'Monthly is probably better to start. What does that include?', 'timestamp', '00:25'),
        jsonb_build_object('role', 'agent', 'content', 'Monthly membership is $49 and includes unlimited booking access and 15% off lessons. I can email you the details if you''d like.', 'timestamp', '00:34'),
        jsonb_build_object('role', 'caller', 'content', 'Yes please, that would be great.', 'timestamp', '00:39')
      );
    ELSIF v_outcome = v_oc_quote THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Hi, I''m looking to get a quote for a ' || v_service || ' rental for a group of 10.', 'timestamp', '00:08'),
        jsonb_build_object('role', 'agent', 'content', 'Happy to help. How long would you need the facility, and on what date?', 'timestamp', '00:16'),
        jsonb_build_object('role', 'caller', 'content', 'Probably two hours, next Friday evening.', 'timestamp', '00:22'),
        jsonb_build_object('role', 'agent', 'content', 'Got it. I''ll put together a quote and email it to you within the hour. Is there a good address?', 'timestamp', '00:31')
      );
    ELSIF v_outcome = v_oc_callback OR v_outcome = v_oc_message THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Hi, I was hoping to speak with someone about ' || v_service || '. Is anyone available?', 'timestamp', '00:09'),
        jsonb_build_object('role', 'agent', 'content', 'The team is tied up right now, but I can take a message and have someone call you back. Can I get your name and the best number to reach you?', 'timestamp', '00:19'),
        jsonb_build_object('role', 'caller', 'content', 'Sure, it''s ' || v_caller_name || '. The number you have is fine.', 'timestamp', '00:26'),
        jsonb_build_object('role', 'agent', 'content', 'Got it. Someone will get back to you by end of day. Thanks for calling!', 'timestamp', '00:33')
      );
    ELSIF v_outcome = v_oc_info THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'What are your hours on the weekend?', 'timestamp', '00:06'),
        jsonb_build_object('role', 'agent', 'content', 'We''re open Saturday and Sunday from 8am to 10pm. Anything else you''d like to know?', 'timestamp', '00:13'),
        jsonb_build_object('role', 'caller', 'content', 'No, that''s all I needed. Thanks!', 'timestamp', '00:17')
      );
    ELSIF v_outcome = v_oc_wrong THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Oh sorry, wrong number.', 'timestamp', '00:05')
      );
    ELSE -- Spam or anything else
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling Ace Sports Complex. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', '...', 'timestamp', '00:04')
      );
    END IF;

    -- Concatenate content for full-text search
    SELECT string_agg(entry->>'content', ' ')
    INTO v_transcript_text
    FROM jsonb_array_elements(v_transcript) AS entry;

    INSERT INTO portal_calls (
      id, org_id, agent_id, direction, status, outcome_category_id,
      caller_number, caller_name, started_at, ended_at, duration_seconds,
      sentiment, sentiment_score, engagement_level, outcome_confidence,
      ai_summary, summary_one_line, transcript, transcript_text
    ) VALUES (
      v_call_id, v_org_id,
      CASE WHEN random() > 0.3 THEN v_agent1_id ELSE v_agent2_id END,
      'inbound',
      v_statuses[1 + (random() * (array_length(v_statuses, 1) - 1))::INTEGER],
      v_outcome,
      v_phones[1 + (v_i % array_length(v_phones, 1))],
      v_caller_name,
      v_started,
      v_started + (v_duration || ' seconds')::INTERVAL,
      v_duration,
      v_sentiments[1 + (random() * 2)::INTEGER],
      (random() * 2 - 1)::NUMERIC(3,2),
      v_engagement[1 + (random() * (array_length(v_engagement, 1) - 1))::INTEGER],
      (0.5 + random() * 0.5)::NUMERIC(3,2),
      'Caller inquired about ' || v_service || ' availability. Agent provided information and assisted with booking.',
      v_caller_name || ' called about ' || v_service,
      v_transcript,
      v_transcript_text
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
