-- Seed: Ontario English recording disclosure as default
-- IMPORTANT: body_text is a PLACEHOLDER. Court Side AI legal review is required before this disclosure is used in production.
-- The agent's system prompt at provisioning time should NOT reference any disclosure marked with the placeholder sentinel below.

INSERT INTO portal_recording_disclosures (jurisdiction, language, body_text, version, is_default, active)
VALUES (
  'Ontario',
  'en',
  '[PLACEHOLDER — pending Court Side AI legal review] This call may be recorded for quality and training purposes. By continuing this call, you consent to the recording. If you do not consent, please let me know now.',
  1,
  TRUE,
  TRUE
)
ON CONFLICT DO NOTHING;
