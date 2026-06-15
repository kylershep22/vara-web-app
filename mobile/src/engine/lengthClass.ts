/**
 * Length size-class mapping (Vara_Engine_Contract.md §5).
 *
 * Length is matched by size class, not exact minute, because the acute
 * downshift breaths are all 2 min and an exact "(5)" target would miss them.
 *   short = 2–5 | medium = 10 | long = 20–45
 */
import type { LengthClass } from './types';

export function timeWindowToLengthClass(timeWindow: number): LengthClass {
  if (timeWindow <= 5) return 'short';
  if (timeWindow <= 10) return 'medium';
  return 'long';
}

const ORDER: Record<LengthClass, number> = { short: 0, medium: 1, long: 2 };

export function lengthClassOrder(lc: LengthClass): number {
  return ORDER[lc];
}

// A practice's class fits a budget when it is no longer than the budget class.
export function lengthClassWithinBudget(lc: LengthClass, budget: LengthClass): boolean {
  return ORDER[lc] <= ORDER[budget];
}
