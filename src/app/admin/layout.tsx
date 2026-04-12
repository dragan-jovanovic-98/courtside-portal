import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";
import type { PortalUser } from "@/lib/types";

export const metadata = {
  title: "Admin — Courtside AI",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Look up any portal_users row for this auth user with role = super_admin.
  // Super_admin is a global role, not org-scoped, so we just need one match.
  const { data: superAdmin } = await supabase
    .from("portal_users")
    .select("*")
    .eq("auth_id", authUser.id)
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  if (!superAdmin) redirect("/dashboard");

  return <AdminShell user={superAdmin as PortalUser}>{children}</AdminShell>;
}
