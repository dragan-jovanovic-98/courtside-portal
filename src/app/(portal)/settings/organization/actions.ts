"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { OutcomeCategory, ImpactTier } from "@/lib/types";

export interface OutcomeCategoryInput {
  id: string | null;
  name: string;
  description: string | null;
  impact_tier: ImpactTier;
  color: string | null;
  sort_order: number;
  close_likelihood: number;
}

type AdminAuth =
  | { ok: true; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string };

async function requireOrgAdmin(orgId: string): Promise<AdminAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("portal_users")
    .select("role")
    .eq("auth_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    return { ok: false, error: "Permission denied" };
  }
  return { ok: true, admin };
}

export async function saveOutcomeCategories(params: {
  orgId: string;
  categories: OutcomeCategoryInput[];
}): Promise<{ success: true; categories: OutcomeCategory[] } | { error: string }> {
  const auth = await requireOrgAdmin(params.orgId);
  if (!auth.ok) return { error: auth.error };

  // Strip synthetic local IDs from new rows so the RPC treats them as inserts.
  // Real UUIDs (existing rows) are passed through to drive UPDATE-by-id.
  const payload = params.categories.map((c, i) => ({
    id: isRealUuid(c.id) ? c.id : null,
    name: c.name,
    description: c.description,
    impact_tier: c.impact_tier,
    color: c.color,
    sort_order: i + 1,
    close_likelihood: c.close_likelihood,
  }));

  const { data, error } = await auth.admin.rpc("portal_update_outcome_categories", {
    p_org_id: params.orgId,
    p_categories: payload,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/organization");
  return { success: true, categories: (data as OutcomeCategory[]) ?? [] };
}

export async function getOutcomeCategoryUsage(params: {
  orgId: string;
  categoryId: string;
}): Promise<{ count: number } | { error: string }> {
  const auth = await requireOrgAdmin(params.orgId);
  if (!auth.ok) return { error: auth.error };

  const { count, error } = await auth.admin
    .from("portal_calls")
    .select("id", { count: "exact", head: true })
    .eq("org_id", params.orgId)
    .eq("outcome_category_id", params.categoryId);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

export async function deleteOutcomeCategoryWithReassignment(params: {
  orgId: string;
  categoryId: string;
  replacementId: string | null;
}): Promise<{ success: true; reassigned: number } | { error: string }> {
  const auth = await requireOrgAdmin(params.orgId);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.admin.rpc(
    "portal_delete_outcome_category_with_reassignment",
    {
      p_category_id: params.categoryId,
      p_replacement_id: params.replacementId,
    }
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/organization");
  return { success: true, reassigned: (data as number) ?? 0 };
}

function isRealUuid(value: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
