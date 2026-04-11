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

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
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

function getUserClient(jwt: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
}

function getJwt(req: Request): string | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function requireOrgRole(
  req: Request,
  orgId: string,
  allowedRoles: PortalUserRole[],
): Promise<AuthContext> {
  const jwt = getJwt(req);
  if (!jwt) throw new AuthError("Not authenticated", 401);

  const userClient = getUserClient(jwt);
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) throw new AuthError("Invalid token", 401);
  const authUserId = userRes.user.id;

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
  const jwt = getJwt(req);
  if (!jwt) throw new AuthError("Not authenticated", 401);

  const userClient = getUserClient(jwt);
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) throw new AuthError("Invalid token", 401);

  const serviceClient = getServiceClient();
  const { data: superAdmin } = await serviceClient
    .from("portal_users")
    .select("id")
    .eq("auth_id", userRes.user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!superAdmin) throw new AuthError("Super admin required", 403);
  return userRes.user.id;
}
