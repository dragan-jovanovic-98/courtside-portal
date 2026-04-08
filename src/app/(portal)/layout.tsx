import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgProvider } from "@/components/providers/org-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { Organization, PortalUser } from "@/lib/types";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Get all org memberships for this auth user
  const { data: memberships } = await supabase
    .from("portal_users")
    .select("*")
    .eq("auth_id", authUser.id);

  if (!memberships || memberships.length === 0) {
    redirect("/login");
  }

  // Use first membership as active org (could be extended with org switcher cookie)
  const activeUser = memberships[0] as PortalUser;

  const { data: org } = await supabase
    .from("portal_organizations")
    .select("*")
    .eq("id", activeUser.org_id)
    .single();

  if (!org) {
    redirect("/login");
  }

  return (
    <OrgProvider
      organization={org as Organization}
      user={activeUser}
      allMemberships={memberships as PortalUser[]}
    >
      <SidebarProvider>
        <div className="flex h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto bg-white px-4 py-6 sm:px-8">
              <div className="mx-auto min-w-0 max-w-[1280px]">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </OrgProvider>
  );
}
