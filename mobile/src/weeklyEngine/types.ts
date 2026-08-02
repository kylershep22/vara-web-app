/**
 * Weekly protocol engine — core types (Vara_Weekly_Engine_Contract.md v1.0).
 *
 * Pure and dependency-light: no React, no Firebase, no system-clock reads.
 * Time enters as a parameter (week number, week-start date), never by reading
 * the clock, so every function here is a pure function of its inputs.
 *
 * Naming note: the weekly protocol type is `WeeklyProtocol`, deliberately not
 * `Protocol`, to avoid colliding with the practice-level `Protocol` in
 * `src/types/models` consumed by `src/engine`. Different concept, and the two
 * modules never import each other.
 */

/**
 * The four outcomes. LOCKED by spec Section 5. This is the single vocabulary
 * across the weekly open, the Practices filters, and content tags. Do not
 * introduce a second set of category names.
 */
export type OutcomeKey = 'focus' | 'stress' | 'routines' | 'energy';

/**
 * The three capacity tiers set at the weekly open (spec 6.1) and adjustable
 * in-week in either direction (spec Section 7).
 */
export type CapacityTier = 'normal' | 'limited' | 'slammed';

/**
 * One cell of the 4 x 3 protocol matrix (spec 6.2).
 *
 * Every user-facing string is PLACEHOLDER [Jen] and lives in `protocolMatrix.ts`.
 * Content is data, not logic: swapping copy never touches a code path.
 */
export interface WeeklyProtocol {
  /** Stable cell id, by convention `${outcome}-${capacity}`. */
  id: string;
  outcome: OutcomeKey;
  capacity: CapacityTier;
  /** PLACEHOLDER [Jen] — protocol name shown on Today. */
  name: string;
  /** PLACEHOLDER [Jen] — the one line the user acts on each day. */
  dailyAction: string;
  /** Rough per-day time cost, for the weekly open. PLACEHOLDER [Jen]. */
  estMinutes: number;
  /** PLACEHOLDER [Jen] — rationale, must stay defensible to a clinical audience. */
  whyItWorks: string;
  /**
   * Reference to the same-session physical practice appended in week 1
   * (spec 6.3). The referenced practice need not exist in the catalog yet.
   */
  quickWinPracticeId: string;
  /**
   * References to OPTIONAL supporting practices. May be empty.
   *
   * This list means optional extras and nothing else. The week-1 quick win is a
   * mandatory same-session step and is carried by `quickWinActive` on
   * `ResolvedWeeklyProtocol`, never by appending to this list.
   */
  supportingPracticeIds: string[];
}

/**
 * A weekly protocol resolved for a specific week (spec 6.3).
 *
 * The matrix in `protocolMatrix.ts` is static content, so the week-dependent
 * quick-win state lives here rather than on `WeeklyProtocol`. `quickWinActive`
 * is always present and explicit: never undefined, never inferred from the
 * shape of another field.
 *
 * When active, the caller surfaces `quickWinPracticeId` as an in-session step
 * alongside the daily action.
 */
export interface ResolvedWeeklyProtocol extends WeeklyProtocol {
  quickWinActive: boolean;
}

/**
 * One completed week, as input to the continuity calculation.
 *
 * This type deliberately carries NO capacity tier. Continuity is measured
 * against the floor commitment and never against the tier (spec Section 1), and
 * leaving the tier off the type is what stops that invariant from regressing.
 * Do not add a tier field here.
 */
export interface WeeklyRecord {
  /** Week-start date, injected by the caller. Never read from the clock here. */
  weekStart: string;
  /** Did the user meet their floor commitment that week? */
  floorMet: boolean;
}
