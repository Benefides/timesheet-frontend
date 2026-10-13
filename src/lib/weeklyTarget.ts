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
