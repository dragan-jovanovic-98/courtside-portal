import type { PortalUserRole } from "@/lib/types";

// Pages accessible from the sidebar
export type Page = "dashboard" | "calls" | "bookings" | "billing" | "referrals" | "settings";

// Settings sub-tabs
export type SettingsTab =
  | "account"
  | "organization"
  | "team"
  | "agents"
  | "integrations"
  | "compliance"
  | "verification"
  | "billing"
  | "notifications";

interface RolePermissions {
  pages: Page[];
  settingsTabs: SettingsTab[];
}

const ROLE_PERMISSIONS: Record<PortalUserRole, RolePermissions> = {
  viewer: {
    pages: ["dashboard", "calls", "bookings"],
    settingsTabs: [],
  },
  member: {
    pages: ["dashboard", "calls", "bookings", "referrals", "settings"],
    settingsTabs: ["account", "organization", "team", "agents", "notifications"],
  },
  admin: {
    pages: ["dashboard", "calls", "bookings", "billing", "referrals", "settings"],
    settingsTabs: [
      "account",
      "organization",
      "team",
      "agents",
      "integrations",
      "compliance",
      "verification",
      "billing",
      "notifications",
    ],
  },
  owner: {
    pages: ["dashboard", "calls", "bookings", "billing", "referrals", "settings"],
    settingsTabs: [
      "account",
      "organization",
      "team",
      "agents",
      "integrations",
      "compliance",
      "verification",
      "billing",
      "notifications",
    ],
  },
  super_admin: {
    pages: ["dashboard", "calls", "bookings", "billing", "referrals", "settings"],
    settingsTabs: [
      "account",
      "organization",
      "team",
      "agents",
      "integrations",
      "compliance",
      "verification",
      "billing",
      "notifications",
    ],
  },
};

export function canAccessPage(role: PortalUserRole, page: Page): boolean {
  return ROLE_PERMISSIONS[role].pages.includes(page);
}

export function canAccessSettingsTab(role: PortalUserRole, tab: SettingsTab): boolean {
  return ROLE_PERMISSIONS[role].settingsTabs.includes(tab);
}

export function hasOwnerPrivileges(role: PortalUserRole): boolean {
  return role === "owner" || role === "super_admin";
}

export function hasAdminPrivileges(role: PortalUserRole): boolean {
  return role === "owner" || role === "admin" || role === "super_admin";
}

// Map of sidebar href segments to Page keys
const PAGE_BY_HREF: Record<string, Page> = {
  "/dashboard": "dashboard",
  "/calls": "calls",
  "/bookings": "bookings",
  "/billing": "billing",
  "/referrals": "referrals",
  "/settings": "settings",
};

// Map of settings tab href segments to SettingsTab keys
const SETTINGS_TAB_BY_HREF: Record<string, SettingsTab> = {
  "/settings/account": "account",
  "/settings/organization": "organization",
  "/settings/team": "team",
  "/settings/agents": "agents",
  "/settings/integrations": "integrations",
  "/settings/compliance": "compliance",
  "/settings/verification": "verification",
  "/settings/billing": "billing",
  "/settings/notifications": "notifications",
};

/**
 * Filter nav items array by role. Accepts items with an `href` string property.
 */
export function getNavItems<T extends { href: string }>(role: PortalUserRole, items: T[]): T[] {
  return items.filter((item) => {
    const page = PAGE_BY_HREF[item.href];
    if (!page) return true; // unknown pages pass through
    return canAccessPage(role, page);
  });
}

/**
 * Filter settings tabs array by role. Accepts items with an `href` string property.
 */
export function getSettingsTabs<T extends { href: string }>(role: PortalUserRole, items: T[]): T[] {
  return items.filter((item) => {
    const tab = SETTINGS_TAB_BY_HREF[item.href];
    if (!tab) return true; // unknown tabs pass through
    return canAccessSettingsTab(role, tab);
  });
}
