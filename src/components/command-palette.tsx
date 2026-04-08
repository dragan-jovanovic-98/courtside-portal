"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  User,
  Building2,
  Users,
  Bot,
  Plug,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandShortcut,
} from "@/components/ui/command";
import { useOrganization } from "@/components/providers/org-provider";
import { searchCalls, searchBookings } from "@/app/(portal)/command-palette-actions";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", shortcut: "D" },
  { label: "Call Logs", icon: Phone, href: "/calls", shortcut: "C" },
  { label: "Bookings", icon: Calendar, href: "/bookings", shortcut: "B" },
  { label: "Billing", icon: CreditCard, href: "/billing" },
  { label: "Settings", icon: Settings, href: "/settings", shortcut: "S" },
  { label: "Account Settings", icon: User, href: "/settings/account" },
  { label: "Organization Settings", icon: Building2, href: "/settings/organization" },
  { label: "Team", icon: Users, href: "/settings/team" },
  { label: "AI Agents", icon: Bot, href: "/settings/agents" },
  { label: "Integrations", icon: Plug, href: "/settings/integrations" },
];

const quickActions = [
  { label: "Invite team member", icon: UserPlus, href: "/settings/team" },
  { label: "Manage billing", icon: CreditCard, href: "/billing" },
  { label: "Connect integration", icon: Plug, href: "/settings/integrations" },
];

type CallResult = {
  id: string;
  caller_name: string | null;
  caller_number: string | null;
  summary_one_line: string | null;
  started_at: string;
};

type BookingResult = {
  id: string;
  title: string | null;
  service_type: string | null;
  scheduled_at: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { organization } = useOrganization();
  const [inputValue, setInputValue] = useState("");
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setInputValue("");
      setCallResults([]);
      setBookingResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputValue.trim()) {
      setCallResults([]);
      setBookingResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const [calls, bookings] = await Promise.all([
        searchCalls(organization.id, inputValue.trim()),
        searchBookings(organization.id, inputValue.trim()),
      ]);
      setCallResults(calls as CallResult[]);
      setBookingResults(bookings as BookingResult[]);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, organization.id]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-xl">
        <CommandInput
          placeholder="Search or jump to..."
          value={inputValue}
          onValueChange={setInputValue}
        />
        <CommandList>
          <CommandEmpty>
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">
              No results found.
            </span>
          </CommandEmpty>

          {inputValue.trim() && callResults.length > 0 && (
            <CommandGroup
              heading={
                <span className="text-[11px] font-medium uppercase text-[rgba(0,0,0,0.45)]">
                  Calls
                </span>
              }
            >
              {callResults.map((call) => (
                <CommandItem
                  key={call.id}
                  value={`call-${call.id}-${call.caller_name || ""}-${call.summary_one_line || ""}`}
                  onSelect={() => navigate(`/calls/${call.id}`)}
                  className="text-[13px] text-[#242529] data-selected:bg-[#eeeff1]"
                >
                  <Phone className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="truncate">
                        {call.caller_name || call.caller_number || "Unknown"}
                      </span>
                      {call.summary_one_line && (
                        <span className="ml-1.5 text-[rgba(0,0,0,0.45)]">
                          — {call.summary_one_line}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-[rgba(0,0,0,0.35)]">
                      {formatDate(call.started_at)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {inputValue.trim() && bookingResults.length > 0 && (
            <CommandGroup
              heading={
                <span className="text-[11px] font-medium uppercase text-[rgba(0,0,0,0.45)]">
                  Bookings
                </span>
              }
            >
              {bookingResults.map((booking) => (
                <CommandItem
                  key={booking.id}
                  value={`booking-${booking.id}-${booking.title || ""}-${booking.service_type || ""}`}
                  onSelect={() => navigate("/bookings")}
                  className="text-[13px] text-[#242529] data-selected:bg-[#eeeff1]"
                >
                  <Calendar className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">
                      {booking.title || booking.service_type || "Untitled booking"}
                    </span>
                    <span className="shrink-0 text-[11px] text-[rgba(0,0,0,0.35)]">
                      {formatDate(booking.scheduled_at)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup
            heading={
              <span className="text-[11px] font-medium uppercase text-[rgba(0,0,0,0.45)]">
                Navigation
              </span>
            }
          >
            {navItems.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => navigate(item.href)}
                className="text-[13px] text-[#242529] data-selected:bg-[#eeeff1]"
              >
                <item.icon className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut className="text-[11px] text-[rgba(0,0,0,0.35)]">
                    {item.shortcut}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup
            heading={
              <span className="text-[11px] font-medium uppercase text-[rgba(0,0,0,0.45)]">
                Quick Actions
              </span>
            }
          >
            {quickActions.map((action) => (
              <CommandItem
                key={action.label}
                value={action.label}
                onSelect={() => navigate(action.href)}
                className="text-[13px] text-[#242529] data-selected:bg-[#eeeff1]"
              >
                <action.icon className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                <span>{action.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-[rgba(0,0,0,0.25)]" />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
