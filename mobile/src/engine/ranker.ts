/**
 * Default deterministic ranker (Vara_Engine_Contract.md §9.4).
 *
 * Ranks candidates best-first by:
 *   1. closeness to the user's time budget (use the window you have),
 *   2. a recency penalty by family (recently-used families ranked later),
 *   3. the filling slot's per-cell lead preference (ctx.leadPreference),
 *   4. the global lead preference (PRACTICE_LEAD_PREFERENCE),
 *   5. a stable alphabetical id tiebreak (fallback).
 *
 * Recency stays ahead of preference: the preferred lead surfaces every session
 * except immediately after it ran. Ids absent from a preference list rank at
 * Infinity for that step and fall through, so an empty or partial list
 * reproduces the alphabetical behavior exactly.
 *
 * Pure: same inputs always produce the same order. History biases the pick but
 * never pre-fills the check-in answer.
 */
import type { Ranker } from './types';
import { lengthClassOrder, timeWindowToLengthClass } from './lengthClass';
import { PRACTICE_LEAD_PREFERENCE } from './practicePreference';

// Best-first index of an id in a preference list; Infinity when absent (or when
// no list applies), so unlisted ids tie at this step and fall through.
function preferenceIndex(list: readonly string[] | undefined, id: string): number {
  if (!list) return Infinity;
  const i = list.indexOf(id);
  return i === -1 ? Infinity : i;
}

export const defaultRanker: Ranker = (candidates, ctx) => {
  const budgetOrder = lengthClassOrder(ctx.budgetClass);
  const recent = new Set(ctx.history?.recentFamilies ?? []);
  const slotPref = ctx.leadPreference;
  return [...candidates].sort((a, b) => {
    // 1. budget-closeness
    const da = Math.abs(
      lengthClassOrder(timeWindowToLengthClass(a.timeWindow)) - budgetOrder
    );
    const db = Math.abs(
      lengthClassOrder(timeWindowToLengthClass(b.timeWindow)) - budgetOrder
    );
    if (da !== db) return da - db;

    // 2. recency penalty by family
    const ra = recent.has(a.family) ? 1 : 0;
    const rb = recent.has(b.family) ? 1 : 0;
    if (ra !== rb) return ra - rb;

    // 3. per-cell slot override
    const sa = preferenceIndex(slotPref, a.id);
    const sb = preferenceIndex(slotPref, b.id);
    if (sa !== sb) return sa - sb;

    // 4. global default preference
    const ga = preferenceIndex(PRACTICE_LEAD_PREFERENCE, a.id);
    const gb = preferenceIndex(PRACTICE_LEAD_PREFERENCE, b.id);
    if (ga !== gb) return ga - gb;

    // 5. stable alphabetical id fallback
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};
