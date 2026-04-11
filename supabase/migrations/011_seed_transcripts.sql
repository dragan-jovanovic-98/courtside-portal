-- Backfill synthetic transcripts on existing portal_calls rows that were
-- seeded without transcript data. Idempotent: only touches rows where
-- transcript IS NULL.
--
-- Variants are keyed on the attached outcome_category.close_likelihood to
-- stay org-agnostic (no coupling to specific category names across niches):
--   close_likelihood >= 50  → booked variant (8 lines)
--   1..49                   → engaged variant (5 lines)
--   0 or no outcome         → dropped variant (2 lines)

DO $$
DECLARE
  r RECORD;
  v_close INTEGER;
  v_transcript JSONB;
  v_transcript_text TEXT;
BEGIN
  FOR r IN
    SELECT c.id, oc.close_likelihood AS close_likelihood
    FROM portal_calls c
    LEFT JOIN portal_outcome_categories oc ON oc.id = c.outcome_category_id
    WHERE c.transcript IS NULL
  LOOP
    v_close := COALESCE(r.close_likelihood, 0);

    IF v_close >= 50 THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Hi, I''d like to book an appointment for this weekend.', 'timestamp', '00:07'),
        jsonb_build_object('role', 'agent', 'content', 'Absolutely, what day and time works best for you?', 'timestamp', '00:13'),
        jsonb_build_object('role', 'caller', 'content', 'Saturday around 3pm if you have anything available.', 'timestamp', '00:18'),
        jsonb_build_object('role', 'agent', 'content', 'Let me check. I have a slot at 3pm for 60 minutes. Should I go ahead and book it?', 'timestamp', '00:26'),
        jsonb_build_object('role', 'caller', 'content', 'Yes, please. Can I get a confirmation by text?', 'timestamp', '00:32'),
        jsonb_build_object('role', 'agent', 'content', 'Of course. You''ll get a confirmation text at this number in just a moment. Anything else?', 'timestamp', '00:40'),
        jsonb_build_object('role', 'caller', 'content', 'No, that''s all. Thanks so much!', 'timestamp', '00:46')
      );
    ELSIF v_close >= 1 THEN
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Hi, I had a few questions about your services.', 'timestamp', '00:07'),
        jsonb_build_object('role', 'agent', 'content', 'Happy to help. What would you like to know?', 'timestamp', '00:13'),
        jsonb_build_object('role', 'caller', 'content', 'Just looking at pricing and availability for next week.', 'timestamp', '00:20'),
        jsonb_build_object('role', 'agent', 'content', 'I can email you a breakdown if that helps — what''s a good address?', 'timestamp', '00:28')
      );
    ELSE
      v_transcript := jsonb_build_array(
        jsonb_build_object('role', 'agent', 'content', 'Thanks for calling. How can I help?', 'timestamp', '00:02'),
        jsonb_build_object('role', 'caller', 'content', 'Oh, sorry — wrong number.', 'timestamp', '00:05')
      );
    END IF;

    SELECT string_agg(entry->>'content', ' ')
    INTO v_transcript_text
    FROM jsonb_array_elements(v_transcript) AS entry;

    UPDATE portal_calls
    SET transcript = v_transcript,
        transcript_text = v_transcript_text
    WHERE id = r.id;
  END LOOP;
END $$;
