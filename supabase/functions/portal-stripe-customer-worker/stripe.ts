// Stripe client for portal-* edge functions.
//
// IMPORTANT: reads from PORTAL_STRIPE_SECRET_KEY — not STRIPE_SECRET_KEY.
// The unprefixed name is reserved for the legacy mortgage broker edge
// functions and must not be touched from portal code.

import Stripe from "npm:stripe@17.5.0";

const STRIPE_API_VERSION = "2024-06-20";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secretKey = Deno.env.get("PORTAL_STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error(
      "PORTAL_STRIPE_SECRET_KEY is not set in edge function secrets.",
    );
  }
  _stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}

export function tsFromUnix(unix?: number | null): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}
