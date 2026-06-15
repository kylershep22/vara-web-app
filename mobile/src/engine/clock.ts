/**
 * Clock modifier helpers (Vara_Engine_Contract.md §8).
 *
 * The evening window is a single named constant. resolve() reads the injected
 * ClockTime; it never reads the system clock, so the evening rules are
 * deterministic.
 */
import type { ClockTime } from './types';

export const EVENING_START_HOUR = 20;

export function isEvening(clock: ClockTime): boolean {
  return clock.hour >= EVENING_START_HOUR;
}
