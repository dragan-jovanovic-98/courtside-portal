"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    items: [
      { label: "Billing & Payment", href: "/settings/billing" },
    ],
  },
  {
    group: "Preferences",
    items: [
      { label: "Notifications", href: "/settings/notifications" },
    ],
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

  return (
    <div className="flex min-w-0 gap-10">
      {/* Left sidebar navigation */}
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

      {/* Mobile tab bar */}
      <nav className="fixed top-0 left-0 right-0 z-20 overflow-x-auto border-b border-[#eeeff1] bg-white p-1 no-scrollbar md:hidden">
        <div className="flex gap-1">
          {filteredTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[14px] font-medium whitespace-nowrap transition-colors",
                pathname === tab.href
                  ? "bg-[#eeeff1] text-[#242529]"
                  : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
