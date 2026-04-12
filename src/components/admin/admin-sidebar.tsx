"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/types";

const navItems = [
  { label: "Organizations", href: "/admin/orgs", icon: Building2 },
];

export function AdminSidebar({ user }: { user: PortalUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[275px] shrink-0 flex-col border-r border-[#eeeff1] bg-[#fbfbfb]">
      {/* Header */}
      <div className="flex h-12 items-center gap-2 border-b border-[#eeeff1] px-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#242529]">
          <ShieldCheck className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="truncate text-[14px] font-semibold text-[#242529]">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pt-2.5">
        <div className="space-y-px">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[#eeeff1] text-[#242529]"
                    : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer: user identity + back to portal */}
      <div className="shrink-0 space-y-1 border-t border-[#eeeff1] px-2 py-1.5">
        <Link
          href="/dashboard"
          className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1]/60 hover:text-[#242529]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <span>Back to portal</span>
        </Link>
        <div className="px-2 py-1.5">
          <p className="truncate text-[13px] font-medium text-[#242529]">
            {user.first_name} {user.last_name ?? ""}
          </p>
          <p className="truncate text-[12px] text-[rgba(0,0,0,0.55)]">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}
