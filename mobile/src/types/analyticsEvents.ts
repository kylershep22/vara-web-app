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
 * Every event and its exact payload.
 *
 * Small on purpose. Only `weekly_open` is wired this slice; `sign_up` and
 * `login` are declared because `AuthContext` already has the call sites the next
 * slice will point here. The rest of the core loop (in-week re-set, weekly
 * close, continuity render, funnel, navigation, failure signal) is the next
 * slice and is deliberately absent: a declared event with no caller would claim
 * coverage that does not exist.
 */
export interface AnalyticsEventMap {
  /** A week was opened. The pair chosen and the protocol it resolved to. */
  weekly_open: {
    outcome: OutcomeKey;
    capacityInitial: CapacityTier;
    protocolId: ProtocolId;
  };
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
