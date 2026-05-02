-- =====================================================================
-- Migration 018: Propagate refined caller_name from portal_calls to portal_contacts
--
-- Why this exists
-- ---------------
-- The BEFORE INSERT trigger trg_portal_calls_upsert_contact (003_functions.sql)
-- creates / links a contact at call insert time, when caller_name is whatever
-- Retell handed us — possibly letter-spelled ("M-A-I-S-Y"), garbled, or null.
-- The post-call analyzer LATER refines caller_name on portal_calls, but the
-- contact row was never re-synced — so the call ended up clean ("Maisy") while
-- the contact stayed ugly ("M-A-I-S-Y").
--
-- This trigger fires AFTER UPDATE OF caller_name and propagates the refined
-- value to the linked contact's first_name, but only when the contact's
-- existing first_name is null/empty/letter-spelled. A contact with an already-
-- clean name is left alone (we don't trust a single later call enough to
-- overwrite a real name).
--
-- The migration also runs a one-time backfill for contacts whose first_name
-- is currently null/empty/letter-spelled, sourcing from each contact's most
-- recent call's caller_name.
-- =====================================================================

CREATE OR REPLACE FUNCTION portal_propagate_refined_caller_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NULL OR NEW.caller_name IS NULL OR NEW.caller_name = '' THEN
    RETURN NEW;
  END IF;

  UPDATE portal_contacts
  SET first_name = NEW.caller_name
  WHERE id = NEW.contact_id
    AND (
      first_name IS NULL
      OR first_name = ''
      OR first_name ~ '^([A-Za-z]-){2,}[A-Za-z]$'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_portal_calls_propagate_caller_name ON portal_calls;
CREATE TRIGGER trg_portal_calls_propagate_caller_name
  AFTER UPDATE OF caller_name ON portal_calls
  FOR EACH ROW
  WHEN (OLD.caller_name IS DISTINCT FROM NEW.caller_name)
  EXECUTE FUNCTION portal_propagate_refined_caller_name();

-- One-time backfill: for each contact whose first_name is null/empty/letter-spelled,
-- adopt the caller_name from that contact's most recent call (if any).
UPDATE portal_contacts pc
SET first_name = sub.caller_name
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, caller_name
  FROM portal_calls
  WHERE contact_id IS NOT NULL
    AND caller_name IS NOT NULL
    AND caller_name <> ''
  ORDER BY contact_id, started_at DESC
) sub
WHERE pc.id = sub.contact_id
  AND (
    pc.first_name IS NULL
    OR pc.first_name = ''
    OR pc.first_name ~ '^([A-Za-z]-){2,}[A-Za-z]$'
  );
