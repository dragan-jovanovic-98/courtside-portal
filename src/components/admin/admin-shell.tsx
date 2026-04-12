"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { PortalUser } from "@/lib/types";

export function AdminShell({
  user,
  children,
}: {
  user: PortalUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white px-4 py-5 sm:px-8 sm:py-6">
          <div className="mx-auto min-w-0 max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
