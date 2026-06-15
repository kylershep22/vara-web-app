/**
 * Default deterministic ranker (Vara_Engine_Contract.md §9.4).
 *
 * Ranks candidates best-first by:
 *   1. closeness to the user's time budget (use the window you have),
 *   2. a recency penalty by family (recently-used families ranked later),
 *   3. a stable alphabetical id tiebreak.
 *
 * Pure: same inputs always produce the same order. History biases the pick but
 * never pre-fills the check-in answer.
 */
import type { Ranker } from './types';
import { lengthClassOrder, timeWindowToLengthClass } from './lengthClass';

export const defaultRanker: Ranker = (candidates, ctx) => {
  const budgetOrder = lengthClassOrder(ctx.budgetClass);
  const recent = new Set(ctx.history?.recentFamilies ?? []);
  return [...candidates].sort((a, b) => {
    const da = Math.abs(
      lengthClassOrder(timeWindowToLengthClass(a.timeWindow)) - budgetOrder
    );
    const db = Math.abs(
      lengthClassOrder(timeWindowToLengthClass(b.timeWindow)) - budgetOrder
    );
    if (da !== db) return da - db;

    const ra = recent.has(a.family) ? 1 : 0;
    const rb = recent.has(b.family) ? 1 : 0;
    if (ra !== rb) return ra - rb;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};
