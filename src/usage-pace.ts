export type UsagePace = 'normal' | 'warning' | 'critical';

export const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000;
export const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Below this much usage a linear projection is noise (3% five minutes in
// "projects" 180%), so pace stays normal.
const MIN_USED_PERCENT = 10;
// Amber once the current rate would end the window at 90% of the limit or more.
const WARNING_PROJECTED_PERCENT = 90;
// Red once the current rate would exhaust the limit before the window resets.
const CRITICAL_PROJECTED_PERCENT = 100;

/**
 * Grades how fast a rate-limit window is being consumed by projecting the
 * used percentage linearly to the window's reset. Returns null when there is
 * no usable rate: missing data, a reset already past, or a reset at least a
 * full window away (no time elapsed).
 */
export function getUsagePace(
  percent: number | null,
  resetAt: Date | null,
  windowMs: number,
  now: number = Date.now(),
): UsagePace | null {
  if (percent === null || !resetAt) {
    return null;
  }

  const remainingMs = resetAt.getTime() - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs >= windowMs) {
    return null;
  }

  if (percent < MIN_USED_PERCENT) {
    return 'normal';
  }

  const elapsedFraction = (windowMs - remainingMs) / windowMs;
  const projected = percent / elapsedFraction;
  if (projected > CRITICAL_PROJECTED_PERCENT) {
    return 'critical';
  }
  if (projected >= WARNING_PROJECTED_PERCENT) {
    return 'warning';
  }
  return 'normal';
}

/** True when pace should draw attention (amber or red). */
export function isPaceAlert(pace: UsagePace | null): boolean {
  return pace === 'warning' || pace === 'critical';
}
