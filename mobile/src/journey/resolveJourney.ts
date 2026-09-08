/**
 * The journey resolver and its migration branch (Journey Architecture Roadmap
 * v3, Section 4).
 *
 * ONE QUESTION: does this user have a journey, and if not can we give them one
 * from data they already produced? The answer is a target Home renders, never
 * a navigation.
 *
 * THE LADDER, in order, and the order is the design:
 *
 *   a. A journeyStates document exists            -> 'today'
 *   b. The latest weekly cycle has an outcome     -> create, 'today'
 *   c. userPrivate.activeOutcome is set           -> create, 'today'
 *   d. Nothing                                    -> 'legacy'
 *
 * IT NEVER GUESSES A DESTINATION. Rung (d) falls through to the weekly landing
 * unchanged rather than defaulting to 'focus'. A wrong destination is worse
 * than no destination: it is invisible, it is what the whole product is
 * organised around, and the user has no way to know they were assigned one.
 * Falling back costs a user nothing except that they keep the surface they
 * already had.
 *
 * (b) BEATS (c) ON PURPOSE. A weekly cycle is a choice the user made and
 * re-made every week; activeOutcome is a single write from the onboarding
 * terminal that nothing has ever read back. When both exist the more recent,
 * more repeated signal wins.
 *
 * THE VOCABULARY GAP IS REAL AND IS BRIDGED HERE. Weekly outcomes are
 * OutcomeKey ('focus' | 'stress' | 'routines' | 'energy'); journey destinations
 * are DestinationKey, which reads 'calm' where the weekly one reads 'stress'.
 * Both rungs map through `destinationForOutcome`, which reads a LEGACY FIELD to
 * derive a destination once and is not itself legacy.
 *
 * `legacyOutcomeFor`, its inverse, WAS HERE AND IS GONE (slice 3a). The engine
 * is keyed on PhaseKey now, so nothing needs to translate a destination back
 * into an outcome. The remaining legacy direction lives in the engine as
 * `legacyPhaseFor` and dies with the JOURNEY_IA flag.
 *
 * `outcomeForDestination` briefly existed for the onboarding terminal and was
 * removed again in slice 4b, along with the cycle write that needed it.
 */
import {
  createJourneyState,
  getJourneyState,
} from '../services/firebase/journeyState.service';
import { getLatestWeeklyCycle } from '../services/firebase/weeklyCycle.service';
import { getUserPrivate } from '../services/firebase/userPrivate.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import type {
  DestinationKey,
  JourneyState,
  PhaseKey,
  RemoveFamily,
} from '../types/models';
import { destinationForOutcome } from './destinationBridge';
import type { JourneyMigrationSource } from '../types/analyticsEvents';

// Re-exported because it is now part of this module's RESULT and not just
// an analytics payload field: useJourneyLanding and Home both name it.
// Re-exported rather than moved so the analytics event map stays the one
// place the source strings are defined.
export type { JourneyMigrationSource };
import type { CapacityTier, OutcomeKey } from '../protocolEngine';
import { logger } from '../utils/logger';
import { toIsoDate } from '../utils/weekStart';

/**
 * What Home needs to render the day, with no weekly cycle in it.
 *
 * `revisionToken` EXISTS BECAUSE useTodayCard RE-RUNS ON A PRIMITIVE, not on an
 * object. The WeeklyCycle path depends on `cycle.id`, which is stable across a
 * re-read; the journey path has no equivalent natural key, because the document
 * ID is the uid and never changes even when the phase does. Millis off
 * `updatedAt` changes exactly when the state changes, which is the property the
 * dependency array needs.
 */
export interface PhaseContext {
  phaseKey: PhaseKey;
  destination: DestinationKey;
  /**
   * The tier a day falls back to when it has not been picked.
   *
   * RE-HOMED IN SLICE 4, and this comment used to say "REMOVED IN SLICE 3" on
   * its first line while its body said slice 4. It is now
   * `userPrivate.capacitySeed`, written once by the onboarding terminal, which
   * is what roadmap section 4 always specified.
   *
   * THE WEEKLY CYCLE IS STILL READ, BUT ONLY AS A FALLBACK, and only for
   * accounts that predate the field. Removing the old read outright would have
   * pinned every EXISTING beta user to 'normal' the moment they next opened
   * the app, since none of them has a seed on userPrivate and none will until
   * they re-onboard, which they never do. That is the failure the section 3.4
   * amendment names: it does not throw, it just quietly serves everyone the
   * wrong tier. The fallback narrows the shim to the accounts that need it
   * instead of deleting it out from under them.
   */
  capacitySeed: CapacityTier;
  /** journeyState.updatedAt in millis. See the note on this interface. */
  revisionToken: number;
  /**
   * The family the user named in the Remove capture (slice 3c-i).
   *
   * UNDEFINED UNTIL THEY CAPTURE, and undefined is the honest value: it means
   * "not asked yet", and selectProtocol returns the cell untouched for it. A
   * default of 'behavioral' would serve the same protocol but would claim the
   * user had chosen it.
   */
  removeFamily?: RemoveFamily;
  /**
   * ISO date the current phase was entered, for deriveConsistentDays.
   *
   * A DATE STRING, NOT THE TIMESTAMP. The derivation compares it against
   * `dailyLog.date`, which is ISO YYYY-MM-DD, and converting once here keeps
   * the comparison in one frame instead of two.
   *
   * Empty string when the server has not resolved `enteredAt` yet, which
   * suppresses the consistency read rather than counting from the epoch.
   */
  enteredAtIso: string;
  /**
   * Has the user completed the Remove capture (slice 3c-i)?
   *
   * DERIVED FROM removeCapturedAt AND NOTHING ELSE. The other four capture
   * fields can each legitimately be null after a completed capture, so gating
   * on any of them would re-offer the flow to someone who had already finished.
   */
  hasRemoveCapture: boolean;
}

export type JourneyResolution =
  | {
      target: 'today';
      phase: PhaseContext;
      /**
       * Set ONLY on the resolve that created the journey, and undefined on
       * every resolve after it.
       *
       * THIS IS WHAT MAKES THE MIGRATION ROUTE SCREEN FIRE ONCE. Home shows A2
       * when this is present. The next launch takes rung (a), which never sets
       * it, so the screen cannot come back: the journeyStates document existing
       * IS the once-only guard, and no flag, counter or stored "seen" field is
       * needed to enforce it. A user who force-quits on A2 sees it once more
       * and then never again, which is the correct answer for a screen that
       * explains something they may not have read.
       */
      migratedFrom?: JourneyMigrationSource;
    }
  | { target: 'legacy' };

/**
 * The vocabulary bridge MOVED to journey/destinationBridge.ts in slice 4, and
 * is re-exported here so existing importers keep working.
 *
 * WHY IT MOVED. It is two pure functions over two string unions, and this
 * module reaches Firestore and analytics. The onboarding terminal needs the
 * destination -> outcome direction, and importing it from here pulled the whole
 * service layer into a screen. A vocabulary mapping should cost nothing to
 * import.
 */
export { destinationForOutcome } from './destinationBridge';

/**
 * journeyState.enteredAt as an ISO date, tolerant of the shapes Firestore
 * returns and of the unresolved-sentinel window.
 */
function enteredAtIsoOf(state: JourneyState): string {
  const stamp = state.enteredAt as unknown as {
    toDate?: () => Date;
    seconds?: number;
  } | null;
  const date =
    stamp && typeof stamp.toDate === 'function'
      ? stamp.toDate()
      : stamp && typeof stamp.seconds === 'number'
        ? new Date(stamp.seconds * 1000)
        : null;
  return date ? toIsoDate(date) : '';
}

/** journeyState.updatedAt, in millis, tolerant of the shapes Firestore returns. */
function revisionOf(state: JourneyState): number {
  const stamp = state.updatedAt as unknown as {
    toMillis?: () => number;
    seconds?: number;
  } | null;
  if (stamp && typeof stamp.toMillis === 'function') return stamp.toMillis();
  if (stamp && typeof stamp.seconds === 'number') return stamp.seconds * 1000;
  // A document mid-write has a null serverTimestamp until the server resolves
  // it. 0 is a stable token for that state: it changes to a real value on the
  // next read, which re-arms the load exactly once, which is correct.
  return 0;
}

/**
 * A non-reversible short digest of a uid, for logs.
 *
 * THE UID ITSELF MUST NEVER REACH A LOG LINE. A warning about a user who could
 * not be migrated is an operational signal; a warning that names the user is
 * personal data sitting in a crash reporter. This is a djb2 hash rendered hex,
 * which is enough to tell two users apart in a log and not enough to identify
 * either.
 */
export function uidDigest(uid: string): string {
  let h = 5381;
  for (let i = 0; i < uid.length; i += 1) {
    h = ((h << 5) + h + uid.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The capacity seed for a user, from its home with a legacy fallback.
 *
 * ORDER IS THE WHOLE POINT. userPrivate.capacitySeed is the answer whenever it
 * exists, which is every account onboarded from slice 4 onward. Only when it is
 * absent does the latest weekly cycle's `capacityInitial` answer, and that is
 * there solely for accounts created before the field existed.
 *
 * THE CYCLE READ IS LAZY, so the common path does not pay for it: a user with a
 * seed never touches weeklyCycles here at all.
 *
 * 'normal' LAST, for a user with neither, which is the same fallback this had
 * before the re-homing.
 *
 * WHEN THE FALLBACK CAN GO. When no account without a seed can still be
 * reached, or when slice 4b retires `capacityInitial` writes. Deleting it
 * before then does not fail: it silently serves 'normal' to every existing beta
 * user, which is the correct-looking bug the section 3.4 amendment describes.
 */
async function resolveCapacitySeed(uid: string): Promise<CapacityTier> {
  const priv = await getUserPrivate(uid);
  if (priv?.capacitySeed) return priv.capacitySeed;

  const latest = await getLatestWeeklyCycle(uid);
  return latest?.capacityInitial ?? 'normal';
}

/**
 * Resolve where Home should land this user.
 *
 * READ-THEN-MAYBE-WRITE. The only write is the migration create on rungs (b)
 * and (c), and it happens at most once per user because rung (a) short-circuits
 * every subsequent call.
 *
 * ANY FAILURE RESOLVES TO 'legacy'. A resolver that threw would take Home down
 * for a surface the user can already reach the old way, so a failed read means
 * the weekly landing serves this session and the ladder tries again next time.
 */
export async function resolveJourney(uid: string): Promise<JourneyResolution> {
  try {
    // ---- (a) already on the journey ----
    const existing = await getJourneyState(uid);

    if (existing) {
      return {
        target: 'today',
        phase: {
          phaseKey: existing.phaseKey,
          destination: existing.destination,
          capacitySeed: await resolveCapacitySeed(uid),
          revisionToken: revisionOf(existing),
          removeFamily: existing.removeFamily ?? undefined,
          enteredAtIso: enteredAtIsoOf(existing),
          hasRemoveCapture: !!existing.removeCapturedAt,
        },
      };
    }

    // ---- (b) and (c) the migration branch ----
    // The cycle is read HERE now, not above. Rung (a) stopped needing it when
    // the seed moved to userPrivate, so a user already on the journey costs one
    // Firestore read fewer per resolve than before this slice.
    const latest = await getLatestWeeklyCycle(uid);

    let destination: DestinationKey | null = null;
    let source: JourneyMigrationSource | null = null;

    if (latest?.outcome) {
      destination = destinationForOutcome(latest.outcome);
      source = 'migration_cycle';
    } else {
      const priv = await getUserPrivate(uid);
      if (priv?.activeOutcome) {
        destination = destinationForOutcome(priv.activeOutcome);
        source = 'migration_active_outcome';
      }
    }

    // ---- (d) nothing to migrate from ----
    if (!destination || !source) {
      logger.warn(
        '[resolveJourney] no destination derivable, falling back to the weekly landing:',
        uidDigest(uid)
      );
      return { target: 'legacy' };
    }

    await createJourneyState(uid, { destination, phaseKey: 'remove' });
    logEvent(uid, 'journey_state_created', { source });

    // Re-read rather than synthesising the document we just wrote: `enteredAt`
    // and `updatedAt` are serverTimestamp sentinels at write time and only the
    // server knows what they resolved to, and revisionToken is read off
    // `updatedAt`. A synthesised token would be wrong on the very first render.
    const created = await getJourneyState(uid);
    if (!created) {
      // The write reported success and the read came back empty. Nothing here
      // can fix that; fall back rather than render a phase we cannot describe.
      logger.warn(
        '[resolveJourney] created journey state not readable back:',
        uidDigest(uid)
      );
      return { target: 'legacy' };
    }

    return {
      target: 'today',
      // A2 fires off this, once. See JourneyResolution.
      migratedFrom: source,
      phase: {
        phaseKey: created.phaseKey,
        destination: created.destination,
        // A migrating account predates userPrivate.capacitySeed by definition,
        // so this is the legacy cycle read almost every time. Routed through
        // the same helper anyway rather than reading `latest` directly, so
        // there is one answer to "where does a seed come from" and not two.
        capacitySeed: await resolveCapacitySeed(uid),
        revisionToken: revisionOf(created),
        // A journey created a moment ago has no capture yet, by construction.
        removeFamily: undefined,
        enteredAtIso: enteredAtIsoOf(created),
        // A journey created a moment ago has no capture, by construction.
        hasRemoveCapture: false,
      },
    };
  } catch (error) {
    logger.error('[resolveJourney] resolve failed, falling back to legacy:', error);
    return { target: 'legacy' };
  }
}
