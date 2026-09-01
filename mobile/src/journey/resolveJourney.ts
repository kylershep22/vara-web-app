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
 * Both rungs map through `destinationForOutcome`. Slice 3 rekeys the matrix and
 * this bridge goes away.
 */
import {
  createJourneyState,
  getJourneyState,
} from '../services/firebase/journeyState.service';
import { getLatestWeeklyCycle } from '../services/firebase/weeklyCycle.service';
import { getUserPrivate } from '../services/firebase/userPrivate.service';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import type { DestinationKey, JourneyState, PhaseKey } from '../types/models';
import type { JourneyMigrationSource } from '../types/analyticsEvents';
import type { CapacityTier, OutcomeKey } from '../protocolEngine';
import { logger } from '../utils/logger';

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
   * TEMPORARY - REMOVED IN SLICE 3. Sourced from the latest weekly cycle's
   * `capacityInitial` because that is still the only place a seed is written.
   * Slice 4 re-homes it onto the journey itself; until then the journey path
   * borrows the weekly one rather than inventing a second answer that would
   * disagree with the flag-off path on the same account.
   */
  capacitySeed: CapacityTier;
  /** journeyState.updatedAt in millis. See the note on this interface. */
  revisionToken: number;
}

export type JourneyResolution =
  | { target: 'today'; phase: PhaseContext }
  | { target: 'legacy' };

/**
 * OutcomeKey -> DestinationKey.
 *
 * The only asymmetric pair is stress -> calm. The other three are spelled the
 * same in both vocabularies, which is exactly why this must be a function and
 * not a cast: three-quarters right is what makes a cast survive review.
 */
export function destinationForOutcome(outcome: OutcomeKey): DestinationKey {
  return outcome === 'stress' ? 'calm' : outcome;
}

/**
 * DestinationKey -> OutcomeKey.
 *
 * TEMPORARY SHIM - REMOVED IN SLICE 3. The protocol matrix and
 * countWeeklyCyclesForOutcome are both keyed on OutcomeKey, so the journey path
 * has to speak weekly to reach them. Slice 3 rekeys the matrix on
 * DestinationKey and deletes this function; nothing else should start depending
 * on it in the meantime.
 */
export function legacyOutcomeFor(destination: DestinationKey): OutcomeKey {
  return destination === 'calm' ? 'stress' : destination;
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
    const latest = await getLatestWeeklyCycle(uid);

    // The seed is read from the weekly cycle on BOTH paths (shim 2), so it is
    // read once here rather than twice below.
    const capacitySeed: CapacityTier = latest?.capacityInitial ?? 'normal';

    if (existing) {
      return {
        target: 'today',
        phase: {
          phaseKey: existing.phaseKey,
          destination: existing.destination,
          capacitySeed,
          revisionToken: revisionOf(existing),
        },
      };
    }

    // ---- (b) and (c) the migration branch ----
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
      phase: {
        phaseKey: created.phaseKey,
        destination: created.destination,
        capacitySeed,
        revisionToken: revisionOf(created),
      },
    };
  } catch (error) {
    logger.error('[resolveJourney] resolve failed, falling back to legacy:', error);
    return { target: 'legacy' };
  }
}
