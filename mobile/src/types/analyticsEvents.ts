/**
 * Analytics event schema — the content firewall.
 *
 * THE ONE RULE: events record BEHAVIOR, never CONTENT. What the user did, never
 * what the user wrote. `closeNote`, the floor-commitment text, journal and
 * reflection bodies, and every [Jen] free-text string are permanently out of
 * bounds.
 *
 * That rule is enforced HERE, BY THE TYPE SYSTEM, and not by reviewer
 * discipline. Every event declares an exact payload whose every value is a
 * closed union, a boolean or a number. There is deliberately:
 *
 *   - no open `string` value anywhere in a payload,
 *   - no `[key: string]: unknown` escape hatch,
 *   - no generic `value` / `label` / `name` field,
 *   - no tolerance for unknown keys (see `ExactParams`).
 *
 * A developer who tries to log content gets a tsc error, not a code review
 * comment. The `@ts-expect-error` assertions in
 * `services/firebase/__tests__/analyticsEvents.service.test.ts` are what keep
 * that true: widen anything here and those directives go unused, which fails
 * the build.
 *
 * ADDING AN EVENT: add a key to `AnalyticsEventMap` with an exact payload type,
 * then add the name to `EVENT_NAME_SET` (tsc requires it — the Record type is
 * exhaustive). If a payload field wants to be a `string`, it is either an enum
 * you have not written down yet or it is content. There is no third case.
 *
 * NOT ANONYMOUS: events are owner-scoped and carry `userId`, because the
 * Firestore rules gate them on ownership. See the header of
 * `services/firebase/analyticsEvents.service.ts`.
 */

import type { CapacityTier, OutcomeKey } from '../weeklyEngine';

/**
 * The 12 protocol ids, as a closed union.
 *
 * `WeeklyProtocol.id` is typed `string`, and a `string` slot in an event payload
 * is precisely the hole this module exists to close. So the id is DERIVED from
 * the outcome/capacity pair rather than read off the protocol object, which
 * buys a 12-member union that arbitrary text cannot satisfy.
 *
 * The derivation mirrors the single place the matrix builds its ids
 * (`weeklyEngine/protocolMatrix.ts`, the `protocol()` factory), and
 * `types/__tests__/analyticsEvents.test.ts` pins the two together across all 12
 * cells so they cannot drift apart unnoticed.
 */
export type ProtocolId = `${OutcomeKey}-${CapacityTier}`;

/** The protocol id for a pair, typed as the closed union. */
export function protocolIdFor(outcome: OutcomeKey, capacity: CapacityTier): ProtocolId {
  return `${outcome}-${capacity}`;
}

/** How an account was authenticated. A closed set, not a free label. */
export type AuthMethod = 'email' | 'apple' | 'google';

/**
 * Why a write failed. Three buckets, and everything else is `unknown`.
 *
 * THE UNION IS THE ONLY GUARD HERE, and this is the one place that is easy to
 * get wrong. `scrubParams` in the writer keeps any string of 1-64 characters, so
 * a raw Firestore code like `'resource-exhausted'` — or a short `error.message`
 * — would sail straight through the runtime backstop and land in the log. Only
 * the closed type stops it.
 *
 * Which is why `toFailureReason` below LOOKS UP rather than passes through: the
 * value it returns is always one of the three literals written in this file, and
 * is never a string that came from the error. A mapper written as
 * `return isKnown(code) ? code : 'unknown'` would type-check and would still be
 * wrong the day someone widens `isKnown`.
 */
export type FailureReason = 'permission-denied' | 'unavailable' | 'unknown';

/**
 * An unknown thrown value to a failure bucket. Never throws, and never returns
 * anything the caller handed in.
 *
 * A SWITCH, NOT A LOOKUP TABLE. Every value it can return is a literal written
 * on the lines below, so there is no path by which an error's own string becomes
 * the logged value. An object keyed by code would also be shorter and would also
 * be wrong: `{ code: 'constructor' }` would index straight through to
 * `Object.prototype.constructor` and log a function.
 *
 * The two named codes are deliberately the only ones. `permission-denied` means
 * the rules refused the write, which is a bug in the rules or in the caller's
 * ownership. `unavailable` means the device could not reach Firestore, which is
 * the user's train tunnel and not a defect. Everything else is noise until a
 * real failure pattern argues for its own bucket, and adding one is a schema
 * decision made here, not a pass-through.
 */
export function toFailureReason(error: unknown): FailureReason {
  if (typeof error !== 'object' || error === null) return 'unknown';

  switch ((error as { code?: unknown }).code) {
    case 'permission-denied':
      return 'permission-denied';
    case 'unavailable':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * The weekly close's 1-5 scale (spec 8.2), as a closed union rather than
 * `number`.
 *
 * A rating is one of five taps, not a quantity, so the tighter type costs
 * nothing and rules out a value that was computed rather than chosen.
 */
export type WeeklyRating = 1 | 2 | 3 | 4 | 5;

/**
 * The adjustment ids offered at the close (spec 8.4).
 *
 * REDECLARED, NOT IMPORTED. The ids live in `screens/weekly/copy.ts`, and a
 * module under `types/` reaching into `screens/` is the wrong direction — this
 * file is imported BY screens. So the union is spelled again here and pinned to
 * the real list by `types/__tests__/analyticsEvents.test.ts`, which is the same
 * trade `ProtocolId` makes above: redeclare, then test the two together so they
 * cannot drift apart unnoticed.
 *
 * These ids are already permanent — `copy.ts` notes that a rename would orphan
 * every stored `adjustmentSelected` — so pinning to them costs nothing.
 */
export const ADJUSTMENT_IDS = [
  'smaller-daily-action',
  'same-again',
  'different-time',
  'different-outcome',
] as const;

export type AdjustmentKey = (typeof ADJUSTMENT_IDS)[number];

/**
 * Where the weekly entry guard sent the user (spec 6.1, 10.1).
 *
 * Redeclared for the same reason as the adjustment ids: `WeeklyEntryTarget`
 * lives in `screens/weekly/weeklyEntry.ts`. Pinned to it by a compile-time
 * mutual-assignability check in the schema test, so adding a fourth target
 * without adding it here fails the build.
 */
export const WEEKLY_ENTRY_ROUTES = ['floor', 'open', 'today'] as const;

export type WeeklyEntryRoute = (typeof WEEKLY_ENTRY_ROUTES)[number];

/**
 * Every event and its exact payload.
 *
 * EVERY NAME HERE HAS A WIRED CALLER. That invariant is the reason the map stays
 * honest about coverage, and the name-list test enforces the count while the
 * per-screen wiring tests enforce the callers.
 *
 * WHAT IS DELIBERATELY ABSENT, each with a reason:
 *   - anything about the in-week capacity re-set, in either direction. That
 *     control is retired (roadmap 3b-i): capacity is answered per day now, so
 *     there is no weekly tier to move, no transition to log and no write to
 *     fail. Its `reset_failed` event went with it.
 *   - a continuity event. Continuity is a pure function of the `floorMet` field
 *     already on every stored cycle, so an aggregation job derives it exactly and
 *     retroactively. It rides as a FIELD on `weekly_close`, where it has one
 *     natural trigger, rather than firing on every Today load.
 *   - `screen_view`. High volume by an order of magnitude, and route names are
 *     open strings that would need their own closed union. Its own slice.
 */
export interface AnalyticsEventMap {
  /** A week was opened. The pair chosen and the protocol it resolved to. */
  weekly_open: {
    outcome: OutcomeKey;
    capacityInitial: CapacityTier;
    protocolId: ProtocolId;
  };
  /**
   * A week was closed.
   *
   * `closeNote` IS NOT HERE AND MAY NEVER BE. It is the one free-text answer in
   * the close (spec 8.3), it is in scope two lines from the call site, and it is
   * short enough that the writer's length backstop would not catch it. This
   * declaration is the whole guard.
   *
   * `continuityBeforeClose` is a count, never a target and never a score. It is
   * named for the side of the boundary it sits on because this collection is
   * designed to be read COLD: nobody querying it will have this file open, and
   * a name that has to be looked up to be trusted is a name that will be
   * guessed at instead.
   */
  weekly_close: {
    ratingFocus: WeeklyRating;
    ratingRecovery: WeeklyRating;
    ratingEnergy: WeeklyRating;
    adjustmentSelected: AdjustmentKey;
    floorMet: boolean;
    /** Unbroken-week run ENTERING this week (pre-close). The post-close run is floorMet ? n+1 : 0, derived at read time — not stored. */
    continuityBeforeClose: number;
  };
  /**
   * A close was answered in full and then failed to save.
   *
   * Worth its own event because the write is a single `updateDoc`: a rejection
   * means nothing landed and the user lost five answers. Nothing else records
   * that today — the screen's `logger.error` is `__DEV__`-gated, so on-device
   * failures currently leave no trace anywhere.
   */
  weekly_close_failed: { reason: FailureReason };
  /*
   * RETIRED: `reset_failed`. It recorded a failed in-week capacity re-set, and
   * that control no longer exists (roadmap 3b-i) — capacity is answered per day
   * now, so there is no weekly tier to move and no write to fail. Removed
   * rather than left declared: an event nothing can emit reads as coverage the
   * product does not have.
   */
  /**
   * A floor commitment was captured (spec 10.1).
   *
   * EMPTY ON PURPOSE. The only thing this screen produces is the user's own
   * words, and there is no bucket, length or shape of it that is a decision
   * input. The fact that it happened is the whole event.
   */
  floor_set: Record<string, never>;
  /**
   * The entry guard resolved a route.
   *
   * All three targets are logged, including `floor`. Note that a first-run user
   * legitimately emits `floor` and then `open` in one continuous flow, because
   * the floor screen replaces back through the guard — that is the funnel, not
   * duplication, and an aggregation that reads the route distribution naively
   * will over-count `floor`.
   */
  weekly_entry: { route: WeeklyEntryRoute };
  /**
   * The close entry on Today was tapped.
   *
   * FIRE-ON-TAP, not fire-after-success: this is the intent half of the pair
   * whose other half is `weekly_close` / `weekly_close_failed`. Tap-with-no-close
   * is the abandon signal, which is the only reason the event exists; it is
   * close to worthless read on its own.
   */
  weekly_close_entry: Record<string, never>;
  /** An account was created. */
  sign_up: { method: AuthMethod };
  /** An existing account signed in. */
  login: { method: AuthMethod };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * Exhaustive by type: `Record<AnalyticsEventName, true>` means adding an event
 * to the map above without adding it here is a tsc error.
 */
const EVENT_NAME_SET: Record<AnalyticsEventName, true> = {
  weekly_open: true,
  weekly_close: true,
  weekly_close_failed: true,
  floor_set: true,
  weekly_entry: true,
  weekly_close_entry: true,
  sign_up: true,
  login: true,
};

/** Every declared event name. Derived, so it cannot fall out of sync. */
export const ANALYTICS_EVENT_NAMES = Object.keys(EVENT_NAME_SET) as readonly AnalyticsEventName[];

/** The exact payload for one event. */
export type AnalyticsParams<N extends AnalyticsEventName> = AnalyticsEventMap[N];

/**
 * Reject unknown keys, including on a payload passed as a variable.
 *
 * TypeScript's excess-property check only fires on fresh object literals, so
 * `const p = { ...safe, closeNote }; logEvent(uid, 'weekly_open', p)` would
 * otherwise slip straight through: an object with extra properties is
 * structurally assignable. Mapping every key outside the declared shape to
 * `never` closes that, which matters because building the payload as a variable
 * is exactly what a developer does when the call site gets busy.
 */
export type ExactParams<P, Shape> = P & {
  [K in Exclude<keyof P, keyof Shape>]: never;
};
