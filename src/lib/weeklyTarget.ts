import { toMinutes } from './duration';

/**
 * Expected hours per week. 40 unless the deployment sets VITE_WEEKLY_TARGET_HOURS.
 * It is a guide, not a cap: time over the target can still be recorded.
 */
export const WEEKLY_TARGET_HOURS = (() => {
  const configured = Number(import.meta.env.VITE_WEEKLY_TARGET_HOURS);
  return Number.isFinite(configured) && configured > 0 ? configured : 40;
})();

export const WEEKLY_TARGET_MINUTES = Math.round(WEEKLY_TARGET_HOURS * 60);

export interface WeekProgress {
  loggedMinutes: number;
  /** Still to log to reach the target; 0 once it is met. */
  remainingMinutes: number;
  /** Logged beyond the target; 0 until it is exceeded. */
  overMinutes: number;
  /** Share of the target logged, rounded; can exceed 100. */
  percent: number;
}

export function weekProgress(loggedMinutes: number): WeekProgress {
  return {
    loggedMinutes,
    remainingMinutes: Math.max(WEEKLY_TARGET_MINUTES - loggedMinutes, 0),
    overMinutes: Math.max(loggedMinutes - WEEKLY_TARGET_MINUTES, 0),
    percent: Math.round((loggedMinutes / WEEKLY_TARGET_MINUTES) * 100),
  };
}

/** Progress from a week's decimal-hours total as the API sends it. */
export function weekProgressFromHours(totalHours: string | number | null | undefined): WeekProgress {
  return weekProgress(toMinutes(totalHours));
}

/** Monday (YYYY-MM-DD) of the week a date falls in. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return new Date(d.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
}

/** Monday–Friday days in [from, to], inclusive. */
export function weekdaysBetween(from: string, to: string): number {
  let n = 0;
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  for (let t = new Date(`${from}T00:00:00.000Z`).getTime(); t <= end; t += 86_400_000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) n += 1;
  }
  return n;
}

/**
 * Target for an arbitrary date range: the weekly target spread over five
 * working days, times the working days in the range (40h → 8h a weekday).
 */
export function rangeTargetMinutes(from: string, to: string): number {
  return Math.round((WEEKLY_TARGET_MINUTES / 5) * weekdaysBetween(from, to));
}

/** Progress against any target, e.g. a range target rather than a week. */
export function progressAgainst(loggedMinutes: number, targetMinutes: number): WeekProgress {
  return {
    loggedMinutes,
    remainingMinutes: Math.max(targetMinutes - loggedMinutes, 0),
    overMinutes: Math.max(loggedMinutes - targetMinutes, 0),
    percent: targetMinutes > 0 ? Math.round((loggedMinutes / targetMinutes) * 100) : 0,
  };
}
