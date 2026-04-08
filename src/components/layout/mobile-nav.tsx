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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const icons = {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Gift,
} as const;

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" as const },
  { label: "Call Logs", href: "/calls", icon: "Phone" as const },
  { label: "Bookings", href: "/bookings", icon: "Calendar" as const },
  { label: "Billing", href: "/billing", icon: "CreditCard" as const },
  { label: "Settings", href: "/settings", icon: "Settings" as const },
  { label: "Referrals", href: "/referrals", icon: "Gift" as const },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" />
        }
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-[#fbfbfb] p-0">
        <SheetHeader className="border-b border-[#eeeff1] px-4 py-3">
          <SheetTitle className="text-left text-[14px] font-semibold text-[#242529] tracking-[-0.14px]">
            {COMPANY_NAME}
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-px p-2">
          {navItems.map((item) => {
            const Icon = icons[item.icon];
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isDisabled = item.href === "/referrals";

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  title="Coming soon"
                  className="flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium text-[rgba(0,0,0,0.3)] cursor-default"
                >
                  <Icon className="h-4 w-4 text-[rgba(0,0,0,0.2)]" />
                  {item.label}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded-[9px] px-2 text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[#eeeff1] text-[#242529]"
                    : "text-[rgba(0,0,0,0.55)] hover:bg-[#eeeff1]/60 hover:text-[#242529]"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-[#242529]" : "text-[rgba(0,0,0,0.35)]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
