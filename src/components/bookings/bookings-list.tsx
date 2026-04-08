"use client";

import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeFull } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Booking } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-[#eeeff1] text-[rgba(0,0,0,0.55)]",
  completed: "bg-emerald-100 text-emerald-800",
  no_show: "bg-rose-100 text-rose-800",
};

interface BookingsListProps {
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
}

export function BookingsList({ bookings, onSelect }: BookingsListProps) {
  const { organization } = useOrganization();
  const tz = organization.timezone;
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="flex flex-col items-center justify-center py-16">
          <CalendarDays className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No bookings yet</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Bookings will appear here when your agent schedules appointments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Date & Time</TableHead>
            <TableHead className="font-semibold">Title</TableHead>
            <TableHead className="font-semibold">Service</TableHead>
            <TableHead className="font-semibold">Duration</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className="cursor-pointer hover:bg-[#f8f9fa]"
              onClick={() => onSelect(booking)}
            >
              <TableCell className="text-[14px]">
                {formatDateTimeFull(booking.scheduled_at, tz)}
              </TableCell>
              <TableCell className="text-[14px] font-medium">
                {booking.title || "Untitled"}
              </TableCell>
              <TableCell className="text-[14px] text-[rgba(0,0,0,0.55)]">
                {booking.service_type || "—"}
              </TableCell>
              <TableCell className="text-[14px]">
                {booking.duration_minutes} min
              </TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[booking.status] || ""}>
                  {booking.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
