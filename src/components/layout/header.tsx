"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { useCommandPalette } from "@/components/providers/command-palette-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Gift,
  LifeBuoy,
  LogOut,
  PanelLeft,
  Menu,
  Search,
} from "lucide-react";

const pageConfig: Record<string, { title: string; icon: typeof LayoutDashboard }> = {
  "/dashboard": { title: "Home", icon: LayoutDashboard },
  "/calls": { title: "Call Logs", icon: Phone },
  "/bookings": { title: "Bookings", icon: Calendar },
  "/billing": { title: "Billing", icon: CreditCard },
  "/settings": { title: "Settings", icon: Settings },
  "/referrals": { title: "Referrals", icon: Gift },
  "/support": { title: "Help & Support", icon: LifeBuoy },
};

function getPageConfig(pathname: string) {
  for (const [path, config] of Object.entries(pageConfig)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return config;
    }
  }
  return { title: "", icon: LayoutDashboard };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useOrganization();
  const { collapsed, setCollapsed } = useSidebar();
  const { setOpen: setCommandOpen } = useCommandPalette();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const config = getPageConfig(pathname);
  const PageIcon = config.icon;
  const initials =
    (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "");

  return (
    <header className="safe-area-top flex h-14 sm:h-12 shrink-0 items-center justify-between border-b border-[#eeeff1] bg-white px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Desktop: collapsed sidebar reopen */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529]"
            aria-label="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {/* Mobile hamburger → drawer */}
        <div className="md:hidden">
          <MobileNav
            trigger={
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#242529] active:bg-[#eeeff1] -ml-1.5"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            }
          />
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <PageIcon className="hidden sm:block h-4 w-4 text-[rgba(0,0,0,0.35)]" />
          <span className="truncate text-[15px] sm:text-[14px] font-semibold sm:font-medium text-[#242529]">
            {config.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Search / command palette trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] transition-colors hover:bg-[#eeeff1] hover:text-[#242529] active:bg-[#eeeff1]"
          aria-label="Open search"
        >
          <Search className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none ml-0.5">
            <div className="flex h-7 w-7 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#242529] text-[11px] sm:text-[10px] font-medium text-white">
              {initials.toUpperCase()}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-[14px] font-medium text-[#242529]">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings/account")}>
              <Settings className="mr-2 h-4 w-4 text-[rgba(0,0,0,0.35)]" />
              <span className="text-[14px]">Account settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4 text-[rgba(0,0,0,0.35)]" />
              <span className="text-[14px]">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

