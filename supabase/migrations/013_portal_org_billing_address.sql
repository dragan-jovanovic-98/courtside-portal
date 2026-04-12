-- Migration 013: Structured billing address on portal_organizations
--
-- Stripe automatic tax requires the customer to have a structured address
-- (line1, city, postal_code, country) to determine tax jurisdiction. The
-- existing portal_organizations.address column is unstructured free text and
-- stays in place as the "business/display" address. These new columns hold
-- the canonical billing address that gets pushed to Stripe.
--
-- Tax policy: automatic_tax is enabled only when billing_country = 'CA'.
-- Stripe Tax must be enabled + registered for the relevant Canadian tax
-- jurisdictions (GST/HST) in the Stripe dashboard separately — this
-- migration does not enable it.

ALTER TABLE portal_organizations
  ADD COLUMN billing_address_line1 TEXT,
  ADD COLUMN billing_address_line2 TEXT,
  ADD COLUMN billing_city TEXT,
  ADD COLUMN billing_state TEXT,
  ADD COLUMN billing_postal_code TEXT,
  ADD COLUMN billing_country TEXT;

COMMENT ON COLUMN portal_organizations.billing_country IS
  'ISO 3166-1 alpha-2 country code (e.g. CA, US). Drives automatic_tax — currently only CA enables tax.';
