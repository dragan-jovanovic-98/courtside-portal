"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Booking } from "@/lib/types";

interface BookingDetailProps {
  booking: Booking;
  onClose: () => void;
}

export function BookingDetail({ booking, onClose }: BookingDetailProps) {
  const { organization } = useOrganization();
  const tz = organization.timezone;
  return (
    <div className="rounded-[10px] border border-[#eeeff1] bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
          Booking Details
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-5 pb-5 space-y-4">
        <div>
          <p className="text-[14px] font-medium text-[#242529]">{booking.title || "Untitled"}</p>
          {booking.description && (
            <p className="mt-0.5 text-[13px] text-[rgba(0,0,0,0.55)]">{booking.description}</p>
          )}
        </div>

        <div className="h-px bg-[#eeeff1]" />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Date</span>
            <span className="text-[13px] font-medium text-[#242529]">
              {formatDate(booking.scheduled_at, tz)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Time</span>
            <span className="text-[13px] font-medium text-[#242529]">
              {formatTime(booking.scheduled_at, tz)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Duration</span>
            <span className="text-[13px] font-medium text-[#242529]">{booking.duration_minutes} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Service</span>
            <span className="text-[13px] font-medium text-[#242529]">{booking.service_type || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Status</span>
            <Badge variant="outline">{booking.status}</Badge>
          </div>
        </div>

        {booking.notes && (
          <>
            <div className="h-px bg-[#eeeff1]" />
            <div>
              <p className="text-[11px] font-medium text-[rgba(0,0,0,0.45)]">Notes</p>
              <p className="mt-1 text-[13px] text-[#242529]">{booking.notes}</p>
            </div>
          </>
        )}

        {booking.call_id && (
          <>
            <div className="h-px bg-[#eeeff1]" />
            <a
              href={`/calls/${booking.call_id}`}
              className="text-[13px] font-medium text-[#266df0] underline-offset-4 hover:underline"
            >
              View related call
            </a>
          </>
        )}
      </div>
    </div>
  );
}
