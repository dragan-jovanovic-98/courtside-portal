"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Users, ExternalLink, Check, Loader2 } from "lucide-react";
import { useOrganization } from "@/components/providers/org-provider";
import { getIntegrationStatus, getCalendarAuthUrl, disconnectCalendar } from "./actions";

const integrations = [
  {
    name: "Google Calendar",
    description: "Sync bookings with Google Calendar automatically. When your AI agent books an appointment, it appears on your calendar.",
    icon: Calendar,
    category: "calendar",
    key: "google_calendar",
    available: true,
  },
  {
    name: "Outlook Calendar",
    description: "Sync bookings with Microsoft Outlook. Calendar events are created automatically when appointments are booked.",
    icon: Calendar,
    category: "calendar",
    key: "outlook_calendar",
    available: false,
  },
  {
    name: "HubSpot CRM",
    description: "Sync contacts and call data with HubSpot. New callers are added as contacts with call history attached.",
    icon: Users,
    category: "crm",
    key: "hubspot",
    available: false,
  },
  {
    name: "Mailchimp",
    description: "Add new contacts to your email marketing lists. Grow your audience from every inbound call.",
    icon: Mail,
    category: "marketing",
    key: "mailchimp",
    available: false,
  },
];

export default function IntegrationsSettingsPage() {
  const { organization } = useOrganization();
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getIntegrationStatus(organization.id).then(setCalendarStatus);
  }, [organization.id]);

  function handleConnect() {
    startTransition(async () => {
      const url = await getCalendarAuthUrl(organization.id);
      window.location.href = url;
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectCalendar(organization.id);
      setCalendarStatus({ connected: false, email: null, connectedAt: null });
    });
  }

  const availableIntegrations = integrations.filter((i) => i.available);
  const comingSoon = integrations.filter((i) => !i.available);

  return (
    <div className="max-w-2xl">
      {/* Connected */}
      {calendarStatus?.connected && (
        <div className="pb-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Connected</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">Integrations currently active on your account.</p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-4 rounded-[10px] border border-[#eeeff1] px-4 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#242529]">Google Calendar</p>
                <p className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  Connected as {calendarStatus.email}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isPending}
                className="shrink-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Available */}
      {!calendarStatus?.connected && (
        <div className="pb-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Integrations</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
            Connect third-party services to automate your workflow.
          </p>

          <div className="mt-5 space-y-2">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div
                  key={integration.name}
                  className="flex items-center gap-4 rounded-[10px] border border-[#eeeff1] px-4 py-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eeeff1]">
                    <Icon className="h-5 w-5 text-[rgba(0,0,0,0.55)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#242529]">{integration.name}</p>
                    <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{integration.description}</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={handleConnect}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        Connect
                        <ExternalLink className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="h-px bg-[#eeeff1]" />

      {/* Coming soon */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Coming soon</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          These integrations are on our roadmap.
        </p>

        <div className="mt-5 space-y-2">
          {comingSoon.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.name}
                className="flex items-center gap-4 rounded-[10px] border border-dashed border-[#eeeff1] px-4 py-3.5 opacity-60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f8f9fa]">
                  <Icon className="h-5 w-5 text-[rgba(0,0,0,0.35)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#242529]">{integration.name}</p>
                  <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{integration.description}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[11px]">
                  Coming soon
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
