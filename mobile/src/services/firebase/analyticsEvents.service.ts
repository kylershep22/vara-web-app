/**
 * analyticsEvents — the behavioral telemetry pipe.
 *
 * WHAT THIS IS: a deliberate reload-only bridge. Events are written to an
 * owner-scoped Firestore collection on the Firebase JS SDK the app already
 * runs. There is NO native Firebase here, no `@react-native-firebase`, no
 * config plugin and no EAS rebuild. Moving to a real analytics vendor is a
 * future migration slice; this exists so the core loop stops shipping blind.
 *
 * WRITE-ONLY FROM THE APP'S SIDE. The rules grant `create` to the owner and
 * nothing else: no read, no update, no delete, for any client. Events are
 * exhaust, not user-facing data, and nothing in the app should ever read them
 * back. Do not add a query helper to this file. Aggregation belongs to the
 * Admin SDK, which bypasses rules.
 *
 * NOT ANONYMOUS, AND THAT IS A TRADEOFF WORTH SEEING. Owner-scoped rules need
 * an owner, so every event carries `userId`. The console stub this replaces
 * kept `setUserId` a deliberate no-op for data minimization; that stance cannot
 * survive a collection whose security model IS ownership. The mitigation is the
 * content firewall in `types/analyticsEvents.ts`: the rows are identifiable but
 * carry only behavior, never anything the user wrote. The consent surface is a
 * fast-follow slice, and `logEvent` below is the single chokepoint it wraps.
 *
 * FIRE AND FORGET. `logEvent` returns `void` synchronously and cannot throw. A
 * failed analytics write must never surface to, block, or break the user action
 * that triggered it. There is nothing to await, so a caller cannot accidentally
 * put analytics on a user-facing path.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

import { requireDb } from './ensureDb';
import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  ExactParams,
} from '../../types/analyticsEvents';

const ANALYTICS_EVENTS = 'analyticsEvents';

/**
 * The longest string a param value may be.
 *
 * Enum members and protocol ids are short; free-form content is not. This is the
 * runtime backstop only — the type in `types/analyticsEvents.ts` is the actual
 * firewall, and it admits no free-form string at all. This catches values that
 * arrive through an `any` cast or from untyped JS, where the type cannot help.
 */
const MAX_PARAM_STRING = 64;

/**
 * A per-app-run id, so events from one session can be joined without
 * identifying anything about the user. Regenerated every launch; never
 * persisted, never derived from the uid.
 *
 * Exported for the test only, hence the underscore prefix.
 */
export const __sessionId: string =
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** The running app version, best effort. Never throws. */
function appVersion(): string | undefined {
  try {
    return Constants?.expoConfig?.version ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Drop anything that is not a safe primitive.
 *
 * Defense in depth, not the primary guard. Objects and arrays go (a nested body
 * is the obvious way content would arrive), as do over-long strings, which is
 * what a close note or journal entry forced through a cast looks like.
 */
function scrubParams(params: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === 'boolean') {
      safe[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === 'string' && value.length > 0 && value.length <= MAX_PARAM_STRING) {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Record one behavioral event. The single chokepoint: every event in the app
 * goes through here, which is what makes a later consent gate one wrapper
 * rather than an audit of every call site.
 *
 * Never throws, never blocks, returns nothing to await.
 */
export function logEvent<N extends AnalyticsEventName, P extends AnalyticsEventMap[N]>(
  userId: string,
  name: N,
  params: ExactParams<P, AnalyticsEventMap[N]>
): void {
  try {
    const version = appVersion();

    // requireDb() throws synchronously when Firebase failed to initialize, so
    // the guard cannot live only in the .catch() below.
    void addDoc(collection(requireDb(), ANALYTICS_EVENTS), {
      userId,
      event: name,
      params: scrubParams(params as Record<string, unknown>),
      timestamp: serverTimestamp(),
      sessionId: __sessionId,
      // Spread rather than assigned: Firestore rejects an `undefined` field
      // value outright, and since this service swallows its own failures that
      // would lose the event silently. An unreadable version costs the field,
      // not the event.
      ...(version === undefined ? {} : { appVersion: version }),
    }).catch(() => {
      // Swallowed on purpose. Analytics failing is not the user's problem, and
      // it is emphatically not a reason to interrupt what they were doing.
    });
  } catch {
    // As above: an unavailable Firestore must not reach the caller either.
  }
}
