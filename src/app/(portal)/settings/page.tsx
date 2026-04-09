"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Users,
  Bot,
  Plug,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useOrganization } from "@/components/providers/org-provider";
import { getSettingsTabs } from "@/lib/permissions";

type SettingsItem = {
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const groups: { group: string; items: SettingsItem[] }[] = [
  {
    group: "Personal",
    items: [
      {
        label: "Account",
        href: "/settings/account",
        description: "Your name, email, and password",
        icon: User,
      },
    ],
  },
  {
    group: "Workspace",
    items: [
      {
        label: "Organization",
        href: "/settings/organization",
        description: "Company details and branding",
        icon: Building2,
      },
      {
        label: "Team",
        href: "/settings/team",
        description: "Members, roles, and invitations",
        icon: Users,
      },
      {
        label: "AI Agents",
        href: "/settings/agents",
        description: "Configure your voice agents",
        icon: Bot,
      },
      {
        label: "Integrations",
        href: "/settings/integrations",
        description: "Connect external services",
        icon: Plug,
      },
    ],
  },
  {
    group: "Compliance",
    items: [
      {
        label: "Compliance",
        href: "/settings/compliance",
        description: "Data, privacy, and consent",
        icon: ShieldCheck,
      },
      {
        label: "Verification",
        href: "/settings/verification",
        description: "Verify your business",
        icon: BadgeCheck,
      },
    ],
  },
  {
    group: "Billing",
    items: [
      {
        label: "Billing & Payment",
        href: "/settings/billing",
        description: "Plan, invoices, payment methods",
        icon: CreditCard,
      },
    ],
  },
  {
    group: "Preferences",
    items: [
      {
        label: "Notifications",
        href: "/settings/notifications",
        description: "Email and in-app alerts",
        icon: Bell,
      },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useOrganization();

  // Desktop: redirect to first accessible sub-tab to preserve prior behavior
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      router.replace("/settings/account");
    }
  }, [router]);

  const filteredGroups = useMemo(() => {
    const allowedHrefs = new Set(
      getSettingsTabs(user.role, allItems).map((i) => i.href)
    );
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => allowedHrefs.has(i.href)),
      }))
      .filter((g) => g.items.length > 0);
  }, [user.role]);

  return (
    <div className="md:hidden">
      <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.4px] text-[#242529]">
        Settings
      </h1>
      <p className="mb-5 text-[14px] text-[rgba(0,0,0,0.55)]">
        Manage your account, team, and workspace
      </p>

      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <section key={group.group}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">
              {group.group}
            </h2>
            <div className="overflow-hidden rounded-xl border border-[#eeeff1] bg-white">
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-[60px] items-center gap-3 px-3.5 active:bg-[#f5f7fa] ${
                      idx > 0 ? "border-t border-[#eeeff1]" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f7fa]">
                      <Icon className="h-[18px] w-[18px] text-[rgba(0,0,0,0.55)]" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-medium text-[#242529]">
                        {item.label}
                      </span>
                      <span className="truncate text-[12.5px] text-[rgba(0,0,0,0.5)]">
                        {item.description}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[rgba(0,0,0,0.3)]" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
