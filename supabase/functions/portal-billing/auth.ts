// Auth + response helpers for portal-billing.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export type PortalUserRole = "owner" | "admin" | "member" | "viewer" | "super_admin";

export interface AuthContext {
  authUserId: string;
  portalUserId: string;
  orgId: string;
  role: PortalUserRole;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AuthError";
  }
}

// CORS headers — portal-billing is called from the browser so we need these
// on every response, including the OPTIONS preflight.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function getJwtFromRequest(req: Request): string | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

// System-level auth bypass for super-admin-only actions when invoked from
// pg_cron via pg_net. Matches the same pattern portal-stripe-customer-worker
// uses — the WORKER_SECRET env var is already set and mirrored in vault.
export function hasWorkerSecret(req: Request): boolean {
  const expected = Deno.env.get("WORKER_SECRET");
  const provided = req.headers.get("x-worker-secret");
  return !!expected && !!provided && provided === expected;
}

// Verify the JWT by calling Supabase's /auth/v1/user endpoint directly.
// Returns the authenticated user's id or null on failure.
//
// Why this approach: the function is deployed with verify_jwt: false because
// the Supabase Gateway's JWT verification does NOT handle the new ES256
// asymmetric JWTs on this project. Doing our own verification via the auth
// endpoint is version-independent and always trustworthy — Supabase Auth
// fetches its own JWKS and verifies the signature there.
async function verifyJwtAndGetUserId(jwt: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/auth/v1/user`,
      {
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
      },
    );
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === "string" ? user.id : null;
  } catch (err) {
    console.error("[auth] /auth/v1/user call failed:", err);
    return null;
  }
}

export async function requireOrgRole(
  req: Request,
  orgId: string,
  allowedRoles: PortalUserRole[],
): Promise<AuthContext> {
  const jwt = getJwtFromRequest(req);
  if (!jwt) throw new AuthError("Not authenticated: missing bearer token", 401);
  const authUserId = await verifyJwtAndGetUserId(jwt);
  if (!authUserId) throw new AuthError("Not authenticated: JWT verification failed", 401);

  const serviceClient = getServiceClient();
  const { data: portalUser, error: puErr } = await serviceClient
    .from("portal_users")
    .select("id, role")
    .eq("auth_id", authUserId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (puErr) throw new AuthError(`Database error: ${puErr.message}`, 500);

  if (portalUser && allowedRoles.includes(portalUser.role as PortalUserRole)) {
    return {
      authUserId,
      portalUserId: portalUser.id,
      orgId,
      role: portalUser.role as PortalUserRole,
    };
  }

  const { data: superAdmin } = await serviceClient
    .from("portal_users")
    .select("id")
    .eq("auth_id", authUserId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (superAdmin) {
    return {
      authUserId,
      portalUserId: superAdmin.id,
      orgId,
      role: "super_admin",
    };
  }

  if (!portalUser) throw new AuthError("Not a member of this organization", 403);
  throw new AuthError(
    `Permission denied: requires role in [${allowedRoles.join(", ")}]`,
    403,
  );
}

export async function requireSuperAdmin(req: Request): Promise<string> {
  const jwt = getJwtFromRequest(req);
  if (!jwt) throw new AuthError("Not authenticated: missing bearer token", 401);
  const authUserId = await verifyJwtAndGetUserId(jwt);
  if (!authUserId) throw new AuthError("Not authenticated: JWT verification failed", 401);

  const serviceClient = getServiceClient();
  const { data: superAdmin } = await serviceClient
    .from("portal_users")
    .select("id")
    .eq("auth_id", authUserId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!superAdmin) throw new AuthError("Super admin required", 403);
  return authUserId;
}
