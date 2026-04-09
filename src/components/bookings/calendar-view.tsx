"use client";

import { useMemo, useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime, formatDateKey } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import type { Booking } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHORT_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

interface CalendarViewProps {
  bookings: Booking[];
  currentDate: Date;
  onSelect: (booking: Booking) => void;
}

export function CalendarView(props: CalendarViewProps) {
  return (
    <>
      <div className="hidden md:block">
        <DesktopMonthCalendar {...props} />
      </div>
      <div className="md:hidden">
        <MobileWeekAgenda {...props} />
      </div>
    </>
  );
}

function DesktopMonthCalendar({
  bookings,
  currentDate,
  onSelect,
}: CalendarViewProps) {
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

// ============================================================
// Mobile: compact week strip + agenda for the selected day
// ============================================================
function MobileWeekAgenda({
  bookings,
  currentDate,
  onSelect,
}: CalendarViewProps) {
  const { organization } = useOrganization();
  const tz = organization.timezone;

  // Local state: which week is shown, and which day within it is selected
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(currentDate, { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    // Default to today if it's in the visible week, otherwise the start
    const today = new Date();
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return today >= ws && today <= we ? today : ws;
  });

  // Sync week strip when parent month changes (e.g. user clicks "Today")
  useEffect(() => {
    setWeekStart(startOfWeek(currentDate, { weekStartsOn: 1 }));
    setSelectedDay(currentDate);
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) out.push(addDays(weekStart, i));
    return out;
  }, [weekStart]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = formatDateKey(b.scheduled_at, tz);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    // sort each day's bookings by time
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime()
      );
    }
    return map;
  }, [bookings, tz]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayBookings = bookingsByDay.get(selectedKey) ?? [];

  function shiftWeek(direction: 1 | -1) {
    const nextStart =
      direction === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    setWeekStart(nextStart);
    // Keep the same weekday position selected within the new week
    const offset = Math.max(
      0,
      Math.min(6, Math.floor((selectedDay.getTime() - weekStart.getTime()) / 86400000))
    );
    setSelectedDay(addDays(nextStart, offset));
  }

  return (
    <div className="space-y-3">
      {/* Week strip with prev/next */}
      <div className="overflow-hidden rounded-[10px] border border-[#eeeff1] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeeff1] px-2 py-2">
          <button
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] active:bg-[#eeeff1]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-medium text-[#242529]">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] active:bg-[#eeeff1]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-[#eeeff1]">
          {weekDays.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDay);
            const count = bookingsByDay.get(key)?.length ?? 0;
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex h-[64px] flex-col items-center justify-center gap-0.5 bg-white px-1 active:bg-[#f5f7fa]",
                  isSelected && "bg-[#242529] active:bg-[#242529]"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    isSelected
                      ? "text-white/70"
                      : "text-[rgba(0,0,0,0.4)]"
                  )}
                >
                  {SHORT_WEEKDAYS[i]}
                </span>
                <span
                  className={cn(
                    "text-[16px] font-semibold tabular-nums leading-none",
                    isSelected
                      ? "text-white"
                      : isToday
                        ? "text-[#266df0]"
                        : "text-[#242529]"
                  )}
                >
                  {format(day, "d")}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isSelected ? "bg-white" : "bg-[#266df0]"
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda for selected day */}
      <div>
        <h3 className="mb-2 px-1 text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
          {format(selectedDay, "EEEE, MMMM d")}
        </h3>
        {dayBookings.length === 0 ? (
          <div className="rounded-[10px] border border-[#eeeff1] bg-white px-4 py-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-[rgba(0,0,0,0.15)]" />
            <p className="mt-2 text-[13px] text-[rgba(0,0,0,0.55)]">
              No bookings scheduled
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[#eeeff1] bg-white">
            {dayBookings.map((booking, i) => {
              const isCancelled = booking.status === "cancelled";
              return (
                <button
                  key={booking.id}
                  onClick={() => onSelect(booking)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#f5f7fa]",
                    i > 0 && "border-t border-[#eeeff1]"
                  )}
                >
                  <div
                    className={cn(
                      "flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center",
                      isCancelled
                        ? "bg-[#f5f5f5]"
                        : "bg-[#f0f4ff]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        isCancelled
                          ? "text-[rgba(0,0,0,0.4)] line-through"
                          : "text-[#266df0]"
                      )}
                    >
                      {formatTime(booking.scheduled_at, tz)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate text-[15px] font-semibold",
                        isCancelled
                          ? "text-[rgba(0,0,0,0.45)] line-through"
                          : "text-[#242529]"
                      )}
                    >
                      {booking.title || "Untitled"}
                    </span>
                    {booking.service_type && (
                      <span className="truncate text-[12.5px] text-[rgba(0,0,0,0.55)]">
                        {booking.service_type}
                      </span>
                    )}
                    <span className="text-[11px] text-[rgba(0,0,0,0.4)]">
                      {booking.duration_minutes} min · {booking.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

