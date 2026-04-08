"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { formatTime, formatDateKey } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import type { Booking } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarViewProps {
  bookings: Booking[];
  currentDate: Date;
  onSelect: (booking: Booking) => void;
}

export function CalendarView({ bookings, currentDate, onSelect }: CalendarViewProps) {
  const { organization } = useOrganization();
  const tz = organization.timezone;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const result: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [calendarStart, calendarEnd]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = formatDateKey(booking.scheduled_at, tz);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(booking);
    }
    return map;
  }, [bookings, tz]);

  const rowCount = Math.ceil(days.length / 7);

  return (
    <div className="rounded-[10px] border border-[#eeeff1] bg-white overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[#eeeff1] bg-[#fbfbfb]">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-[#eeeff1] px-2 py-2 text-center text-[11px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-wide last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDay.get(key) || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-[#eeeff1] px-1.5 pb-1.5 pt-1",
                "[&:nth-child(7n)]:border-r-0",
                !isCurrentMonth && "bg-[#fafafa]",
                rowCount <= 5 ? "min-h-[120px]" : "min-h-[100px]"
              )}
            >
              <div className="flex justify-center pb-1">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium",
                    isToday
                      ? "bg-[#242529] text-white"
                      : isCurrentMonth
                        ? "text-[#242529]"
                        : "text-[rgba(0,0,0,0.2)]"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-[3px]">
                {dayBookings.slice(0, 3).map((booking) => {
                  const isCancelled = booking.status === "cancelled";
                  return (
                    <button
                      key={booking.id}
                      onClick={() => onSelect(booking)}
                      className={cn(
                        "group flex w-full items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-left transition-colors",
                        isCancelled
                          ? "bg-[#f5f5f5] hover:bg-[#eeeff1]"
                          : "bg-[#f0f4ff] hover:bg-[#e4ebff]"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[11px] font-medium tabular-nums shrink-0",
                          isCancelled ? "text-[rgba(0,0,0,0.3)] line-through" : "text-[#266df0]"
                        )}
                      >
                        {formatTime(booking.scheduled_at, tz)}
                      </span>
                      <span
                        className={cn(
                          "truncate text-[11px]",
                          isCancelled ? "text-[rgba(0,0,0,0.3)] line-through" : "text-[#242529]"
                        )}
                      >
                        {booking.title || booking.service_type}
                      </span>
                    </button>
                  );
                })}
                {dayBookings.length > 3 && (
                  <button
                    onClick={() => onSelect(dayBookings[3])}
                    className="px-1.5 text-[11px] font-medium text-[rgba(0,0,0,0.4)] hover:text-[#266df0] transition-colors"
                  >
                    +{dayBookings.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
