"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Gift,
  Search,
  UserPlus,
  PanelLeftClose,
  LifeBuoy,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/providers/org-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { getNavItems } from "@/lib/permissions";
import { CommandPalette } from "@/components/command-palette";

const icons = {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Gift,
} as const;

const coreNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" as const },
  { label: "Call Logs", href: "/calls", icon: "Phone" as const },
  { label: "Bookings", href: "/bookings", icon: "Calendar" as const },
  { label: "Billing", href: "/billing", icon: "CreditCard" as const },
  { label: "Settings", href: "/settings", icon: "Settings" as const },
];

const referralItem = { label: "Referrals", href: "/referrals", icon: "Gift" as const };

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const { user, organization } = useOrganization();
  const filteredCoreItems = useMemo(() => getNavItems(user.role, coreNavItems), [user.role]);
  const showReferrals = useMemo(() => getNavItems(user.role, [referralItem]).length > 0, [user.role]);
  const [commandOpen, setCommandOpen] = useState(false);
  const handleCommandOpenChange = useCallback((open: boolean) => setCommandOpen(open), []);

  const orgInitial = organization.name?.[0]?.toUpperCase() ?? "O";

  function NavLink({ href, label, icon: Icon, disabled }: { href: string; label: string; icon: typeof LayoutDashboard; disabled?: boolean }) {
    const isActive = !disabled && (pathname === href || pathname.startsWith(href + "/"));

    if (disabled) {
      return (
        <div
          title="Coming soon"
          className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.3)] cursor-default"
        >
          <Icon className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.2)]" />
          <span>{label}</span>
        </div>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          "flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors",
          isActive
            ? "bg-[#eeeff1] text-[#242529]"
            : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-[#fbfbfb] border-r border-[#eeeff1] w-[275px] shrink-0 transition-[margin] duration-200 ease-in-out",
        collapsed && "-ml-[275px]"
      )}
    >
      {/* Workspace header */}
      <div className="flex h-12 items-center justify-between shrink-0 px-3 border-b border-[#eeeff1]">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#242529] text-[10px] font-bold text-white">
            {orgInitial}
          </div>
          <span className="truncate text-[14px] font-semibold text-[#242529]">
            {organization.name}
          </span>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-2 pt-2.5 pb-1.5">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-7 w-full items-center gap-[6px] rounded-lg bg-white px-2 text-[14px] font-medium text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1]/60"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Quick actions</span>
          <kbd className="text-[11px] text-[rgba(0,0,0,0.35)]">⌘K</kbd>
        </button>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={handleCommandOpenChange} />

      {/* Core navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-px">
          {filteredCoreItems.map((item) => {
            const Icon = icons[item.icon];
            return <NavLink key={item.href} href={item.href} label={item.label} icon={Icon} />;
          })}
        </div>

        {/* Resources section */}
        <div className="mt-5">
          <div className="px-2 pb-1.5">
            <span className="text-[12px] font-medium text-[rgba(0,0,0,0.55)] tracking-[-0.12px]">
              Resources
            </span>
          </div>
          <div className="space-y-px">
            {showReferrals && (
              <NavLink href="/referrals" label="Referrals" icon={Gift} disabled />
            )}
            <NavLink href="/support" label="Help & Support" icon={LifeBuoy} />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#eeeff1] px-2 py-1.5 space-y-1">
        <Link
          href="/settings/team"
          className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1]/60 hover:text-[#242529]"
        >
          <UserPlus className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <span>Invite team members</span>
        </Link>
        <div className="flex items-center justify-between rounded-[9px] px-2 py-1.5">
          <div className="flex items-center gap-[6px] min-w-0">
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate text-[13px] font-medium text-[rgba(0,0,0,0.55)]">
              {organization.stripe_customer_id ? "Active plan" : "Free plan"}
            </span>
          </div>
          <Link
            href="/billing"
            className="text-[12px] font-medium text-[#266df0] hover:underline shrink-0"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </aside>
  );
}
