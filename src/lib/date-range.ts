import { subDays, startOfDay, endOfDay } from "date-fns";

export function getDateRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const preset = searchParams.get("range") || "30d";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");

  if (customFrom && customTo) {
    return { from: new Date(customFrom), to: endOfDay(new Date(customTo)) };
  }

  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    case "90d":
      return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) };
    case "180d":
      return { from: startOfDay(subDays(now, 180)), to: endOfDay(now) };
    case "30d":
    default:
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
  }
}
