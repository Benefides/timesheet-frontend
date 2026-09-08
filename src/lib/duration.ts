/**
 * Durations are stored and transmitted as decimal hours (Prisma Decimal(5,2)),
 * but people record time as hours + minutes. These helpers are the single
 * conversion point between the two.
 *
 * Rounding is safe in both directions: a whole number of minutes converted to
 * two-decimal hours is off by at most 0.005 h (0.3 min), so rounding the value
 * back to minutes always recovers the exact minute the user typed.
 */

const MINUTES_PER_HOUR = 60;

/** Whole minutes from a decimal-hours value (an API string or a number). */
export function toMinutes(hours: string | number | null | undefined): number {
  const n = Number(hours);
  return Number.isFinite(n) ? Math.round(n * MINUTES_PER_HOUR) : 0;
}

/** Decimal hours, rounded to the 2 decimals the column stores. */
export function toDecimalHours(
  hours: string | number | null | undefined,
  minutes: string | number | null | undefined,
): number {
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  return Math.round(((h * MINUTES_PER_HOUR + m) / MINUTES_PER_HOUR) * 100) / 100;
}

/** Split decimal hours into the hour and minute parts a form edits. */
export function splitDuration(hours: string | number | null | undefined): {
  hours: number;
  minutes: number;
} {
  const total = toMinutes(hours);
  return { hours: Math.floor(total / MINUTES_PER_HOUR), minutes: total % MINUTES_PER_HOUR };
}

/** Human duration from whole minutes: "2h 30m", "45m", "8h". */
export function formatMinutes(total: number): string {
  if (!total) return '0h';
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / MINUTES_PER_HOUR);
  const m = abs % MINUTES_PER_HOUR;
  if (!h) return `${sign}${m}m`;
  if (!m) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/** Human duration from decimal hours. */
export function formatHours(hours: string | number | null | undefined): string {
  return formatMinutes(toMinutes(hours));
}

/**
 * Total minutes across entries. Summing minutes rather than decimal hours keeps
 * per-entry rounding from accumulating in day and week totals.
 */
export function sumMinutes(entries: { hours: string }[]): number {
  return entries.reduce((sum, e) => sum + toMinutes(e.hours), 0);
}
