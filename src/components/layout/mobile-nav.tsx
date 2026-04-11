"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Gift,
  LifeBuoy,
  UserPlus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/providers/org-provider";
import { getNavItems } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import { useSwipeDismiss } from "@/lib/hooks/use-swipe-dismiss";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

export function MobileNav({ trigger }: { trigger: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization } = useOrganization();
  const [open, setOpen] = useState(false);

  const filteredCoreItems = useMemo(
    () => getNavItems(user.role, coreNavItems),
    [user.role]
  );
  const showReferrals = useMemo(
    () => getNavItems(user.role, [referralItem]).length > 0,
    [user.role]
  );
  const swipeHandlers = useSwipeDismiss({
    onDismiss: () => setOpen(false),
    direction: "left",
  });

  // Close drawer whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const orgInitial = organization.name?.[0]?.toUpperCase() ?? "O";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  function NavRow({
    href,
    label,
    icon: Icon,
    disabled,
  }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    disabled?: boolean;
  }) {
    const isActive = !disabled && (pathname === href || pathname.startsWith(href + "/"));

    if (disabled) {
      return (
        <div
          className="flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-[15px] font-medium text-[rgba(0,0,0,0.3)]"
          aria-disabled
        >
          <Icon className="h-[18px] w-[18px] shrink-0 text-[rgba(0,0,0,0.2)]" />
          <span>{label}</span>
          <span className="ml-auto text-[11px] uppercase tracking-wide text-[rgba(0,0,0,0.25)]">
            Soon
          </span>
        </div>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          "flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-[15px] font-medium transition-colors",
          isActive
            ? "bg-[#eeeff1] text-[#242529]"
            : "text-[rgba(0,0,0,0.65)] active:bg-[#eeeff1]/80"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.45)]"
          )}
        />
        <span>{label}</span>
      </Link>
    );
  }

  const userInitials =
    ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || "U";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent
        side="left"
        className="w-[82%] max-w-[320px] bg-[#fbfbfb] p-0 flex flex-col gap-0"
        showCloseButton={false}
        {...swipeHandlers}
      >
        {/* Workspace header */}
        <div className="safe-area-top flex h-14 items-center gap-2.5 border-b border-[#eeeff1] px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#242529] text-[11px] font-bold text-white">
            {orgInitial}
          </div>
          <span className="truncate text-[15px] font-semibold text-[#242529]">
            {organization.name}
          </span>
        </div>

        {/* Core navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pt-2">
          <div className="space-y-px">
            {filteredCoreItems.map((item) => {
              const Icon = icons[item.icon];
              return (
                <NavRow
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={Icon}
                />
              );
            })}
          </div>

          {/* Resources section */}
          <div className="mt-4">
            <div className="px-3 pb-1.5 pt-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                Resources
              </span>
            </div>
            <div className="space-y-px">
              {showReferrals && (
                <NavRow href="/referrals" label="Referrals" icon={Gift} disabled />
              )}
              <NavRow href="/support" label="Help & Support" icon={LifeBuoy} />
              <NavRow href="/settings/team" label="Invite team" icon={UserPlus} />
            </div>
          </div>
        </nav>

        {/* Footer: user + sign out */}
        <div className="safe-area-bottom shrink-0 border-t border-[#eeeff1] px-2 py-2 space-y-1">
          <Link
            href="/settings/account"
            className="flex h-12 items-center gap-2.5 rounded-[10px] px-3 text-[14px] font-medium text-[rgba(0,0,0,0.7)] active:bg-[#eeeff1]/80"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#242529] text-[11px] font-medium text-white">
              {userInitials}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold text-[#242529]">
                {user.first_name} {user.last_name}
              </span>
              <span className="truncate text-[12px] font-normal text-[rgba(0,0,0,0.5)]">
                {user.email}
              </span>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-[14px] font-medium text-[rgba(0,0,0,0.65)] active:bg-[#eeeff1]/80"
          >
            <LogOut className="h-[18px] w-[18px] text-[rgba(0,0,0,0.45)]" />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
