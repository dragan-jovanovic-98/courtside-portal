"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/providers/org-provider";
import { getSettingsTabs } from "@/lib/permissions";

const settingsTabs = [
  {
    group: "Personal",
    items: [{ label: "Account", href: "/settings/account" }],
  },
  {
    group: "Workspace",
    items: [
      { label: "Organization", href: "/settings/organization" },
      { label: "Team", href: "/settings/team" },
      { label: "AI Agents", href: "/settings/agents" },
      { label: "Integrations", href: "/settings/integrations" },
    ],
  },
  {
    group: "Compliance",
    items: [
      { label: "Compliance", href: "/settings/compliance" },
      { label: "Verification", href: "/settings/verification" },
    ],
  },
  {
    group: "Billing",
    items: [{ label: "Billing & Payment", href: "/settings/billing" }],
  },
  {
    group: "Preferences",
    items: [{ label: "Notifications", href: "/settings/notifications" }],
  },
];

const allTabs = settingsTabs.flatMap((g) => g.items);

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useOrganization();

  const filteredTabs = useMemo(
    () => getSettingsTabs(user.role, allTabs),
    [user.role]
  );

  const filteredGroups = useMemo(() => {
    const allowedHrefs = new Set(filteredTabs.map((t) => t.href));
    return settingsTabs
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowedHrefs.has(item.href)),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredTabs]);

  const isIndex = pathname === "/settings";

  return (
    <div className="flex min-w-0 gap-10">
      {/* Desktop sidebar navigation */}
      <nav className="hidden w-[200px] shrink-0 md:block">
        <div className="sticky top-0 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-[rgba(0,0,0,0.35)]">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      pathname === tab.href
                        ? "bg-[#eeeff1] font-medium text-[#242529]"
                        : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Mobile back-to-settings header (only on sub-routes) */}
        {!isIndex && (
          <div className="md:hidden -mt-1 mb-4 flex items-center">
            <Link
              href="/settings"
              className="flex h-9 items-center gap-1 -ml-2 pl-1 pr-2 rounded-md text-[14px] font-medium text-[rgba(0,0,0,0.55)] active:bg-[#eeeff1]"
            >
              <ChevronLeft className="h-4 w-4" />
              Settings
            </Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
