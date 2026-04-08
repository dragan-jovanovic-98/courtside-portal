"use client";

import { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/bookings/calendar-view";
import { BookingsList } from "@/components/bookings/bookings-list";
import { BookingDetail } from "@/components/bookings/booking-detail";
import type { Booking } from "@/lib/types";

export function BookingsPageContent({ bookings }: { bookings: Booking[] }) {
  const [view, setView] = useState<"calendar" | "list">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const upcoming = bookings.filter(
    (b) => new Date(b.scheduled_at) >= new Date() && b.status !== "cancelled"
  );
  const past = bookings.filter(
    (b) => new Date(b.scheduled_at) < new Date() || b.status === "cancelled"
  );

  if (bookings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            List
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>
        <div className="rounded-lg border border-[#eeeff1] bg-white">
          <div className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
            <p className="mt-4 text-[14px] font-medium text-[#242529]">No bookings yet</p>
            <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Appointments booked by your AI agent will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            className="gap-1.5"
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("calendar")}
            className="gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>

        {view === "calendar" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center text-[13px] font-medium text-[#242529]">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={selectedBooking ? "lg:col-span-2" : "lg:col-span-3"}>
          {view === "calendar" ? (
            <CalendarView
              bookings={bookings}
              currentDate={currentDate}
              onSelect={setSelectedBooking}
            />
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
                  Upcoming ({upcoming.length})
                </h3>
                <BookingsList bookings={upcoming} onSelect={setSelectedBooking} />
              </div>
              {past.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
                    Past ({past.length})
                  </h3>
                  <BookingsList bookings={past} onSelect={setSelectedBooking} />
                </div>
              )}
            </div>
          )}
        </div>

        {selectedBooking && (
          <div>
            <BookingDetail
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
