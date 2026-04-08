/**
 * Timezone-aware date formatting using Intl.DateTimeFormat.
 * All display dates should use these helpers with the org timezone.
 */

/** "Mar 27, 2026" */
export function formatDate(date: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(date));
}

/** "4:52 PM" */
export function formatTime(date: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(date));
}

/** "Mar 27, 4:52 PM" */
export function formatDateTime(date: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(date));
}

/** "Mar 27, 2026, 4:52 PM" */
export function formatDateTimeFull(date: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(date));
}

/** "Mar 27, 2026 · 4:52 PM" — for display with custom separator */
export function formatDateDotTime(date: string | Date, tz: string): string {
  return `${formatDate(date, tz)} · ${formatTime(date, tz)}`;
}

/** "2026-03-27" — for grouping/keys, timezone-aware */
export function formatDateKey(date: string | Date, tz: string): string {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(d);
  return parts; // en-CA gives YYYY-MM-DD
}

/** "Mon", "Tue", etc. */
export function formatWeekday(date: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(new Date(date));
}

/** Get the hour (0-23) in the org timezone */
export function getHourInTz(date: string | Date, tz: string): number {
  const d = new Date(date);
  const hourStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: tz,
  }).format(d);
  return parseInt(hourStr, 10);
}

/** "h:mm a" for booking times */
export function formatBookingTime(date: string | Date, tz: string): string {
  return formatTime(date, tz);
}
