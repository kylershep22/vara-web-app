/**
 * Brain State Check-In Service
 * CRUD operations for the brainStateCheckIns Firestore collection,
 * plus the sub-step 2.5 `writeStandardFlowSession` helper that does
 * parallel writes to both the legacy `brainStateCheckIns` collection
 * (for backward compat with v1 read paths) AND the new
 * `protocolSessions` collection (the Phase 2+ authoritative source).
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BrainState, BrainStateCheckIn } from '../../types';
import { selectProtocol } from '../protocolSelector.service';
import { logger } from '../../utils/logger';
import {
  normalizeBrainState,
  serializeBrainState,
} from '../../utils/brainStateNormalizer';
import type { TerminalFlowState } from '../../components/checkin/flow/CheckInFlow';
import type {
  IntentPath,
  MovementModality,
  ProtocolSessionOutcome,
  UserProfile,
} from '../../types/models';
import {
  writeProtocolSession,
  type ProtocolSessionWritePayload,
  type WriteProtocolSessionOptions,
} from './protocolSession.service';

// Turn a raw Firestore doc into a BrainStateCheckIn, normalizing legacy
// brainState values ("okay" → "steady", "energized" → "alive"). Returns null
// if the doc's brainState is missing or unrecognizable — caller decides how
// to handle (skip in a list, treat as "no check-in today," etc.).
function toBrainStateCheckIn(
  id: string,
  data: Record<string, unknown>
): BrainStateCheckIn | null {
  try {
    const brainState = normalizeBrainState(data.brainState as string);
    return { id, ...data, brainState } as BrainStateCheckIn;
  } catch (error) {
    logger.warn(
      `Skipping brainStateCheckIn doc ${id} with invalid brainState:`,
      error
    );
    return null;
  }
}

const COLLECTION = 'brainStateCheckIns';

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch today's brain state check-in for a user.
 * Returns null if no check-in exists for today.
 */
export const getTodayBrainStateCheckIn = async (
  userId: string
): Promise<BrainStateCheckIn | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return toBrainStateCheckIn(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    logger.error('Error getting brain state check-in:', error);
    return null;
  }
};

/**
 * Save (or update) today's brain state check-in.
 *
 * Round 8 (Bug F fix): the optional `protocolId` parameter overrides
 * the default-recommended protocolId computed via `selectProtocol`.
 *
 * **V1 vestige WARNING.** The `selectProtocol` fallback exists ONLY
 * to support `OnboardingV2CheckInScreen`'s pre-completion legacy-doc
 * write (chip tap → save check-in → navigate to recommendation
 * screen). In that pre-completion context the legacy doc's
 * `protocolId` field legitimately carries "what we're about to
 * recommend the user run."
 *
 * **Any post-completion call site MUST pass the actual completed
 * protocol's id.** Relying on the fallback in a post-completion
 * context produces the round-8 Bug F symptom: the legacy doc
 * carries a default recommendation that mismatches the user's
 * actually-run protocol, and the dashboard's "[name] — Completed"
 * card displays the wrong name. The bug was latent on the standard
 * CheckInFlow path (hidden because users typically accept the
 * recommendation, so the default-computed id matched the run id);
 * round-7's Bug B routing change exposed it on the BrowseRunFlow-
 * with-context path where the user picked a different protocol.
 * See PHASE_NOTES "Sub-step 2.7 round 8 — Bug F" for the full
 * analysis.
 *
 * Phase 5 migrations remove this legacy `protocolId` field entirely;
 * until then this is the contract.
 */
export const saveBrainStateCheckIn = async (
  userId: string,
  brainState: BrainState,
  protocolId?: string
): Promise<BrainStateCheckIn> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const resolvedProtocolId =
      protocolId ?? selectProtocol({ state: brainState, timeWindow: 5 }).id;

    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : null;
    const serializedState = serializeBrainState(brainState);

    if (existingData) {
      // Normalize the stored value before comparing so a legacy "okay" doc
      // isn't treated as different from an incoming "steady".
      let existingBrainState: BrainState | null = null;
      try {
        existingBrainState = normalizeBrainState(
          existingData.brainState as string
        );
      } catch {
        existingBrainState = null;
      }
      const stateChanged = existingBrainState !== brainState;
      await updateDoc(docRef, {
        brainState: serializedState,
        protocolId: resolvedProtocolId,
        // Only reset protocol completion if brain state actually changed
        ...(stateChanged && { protocolCompleted: false }),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        ...existingData,
        brainState,
        protocolId: resolvedProtocolId,
        ...(stateChanged && { protocolCompleted: false }),
      } as BrainStateCheckIn;
    } else {
      await setDoc(docRef, {
        userId,
        date: todayDate,
        brainState: serializedState,
        protocolId: resolvedProtocolId,
        protocolCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        userId,
        date: todayDate,
        brainState,
        protocolId: resolvedProtocolId,
        protocolCompleted: false,
      } as BrainStateCheckIn;
    }
  } catch (error) {
    logger.error('Error saving brain state check-in:', error);
    throw error;
  }
};

/**
 * Mark today's protocol as completed.
 */
export const markProtocolCompleted = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    await updateDoc(docRef, {
      protocolCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error marking protocol completed:', error);
    throw error;
  }
};

/**
 * Maps a CheckInFlow terminal state to the new ProtocolSession write
 * payload. Pure function — extracted for unit-testability without
 * mocking Firestore.
 *
 * `intentPath` is forwarded from the caller. Phase 3 wires the user's
 * resolved intent path through the flow; until then, callers pass
 * `'default'`.
 *
 * Outcome mapping:
 *   - `step === 'abandoned'` → outcome='abandoned', stateAfter=null.
 *   - `step === 'flow_complete'` → outcome from the terminal's
 *     classifier output (already computed at re_check → response).
 */
export function mapStandardFlowTerminalToPayload(
  terminal: TerminalFlowState,
  intentPath: IntentPath
): ProtocolSessionWritePayload {
  if (terminal.step === 'abandoned') {
    return {
      protocolId: terminal.protocol.id,
      stateBefore: terminal.stateBefore,
      stateAfter: null,
      timeWindowSelected: terminal.timeWindow,
      durationActualSeconds: terminal.durationActualSeconds,
      outcome: 'abandoned',
      userChosenNextStep: null,
      intentPath,
      sessionStartedAt: terminal.sessionStartedAt,
    };
  }
  // step === 'flow_complete'
  return {
    protocolId: terminal.protocol.id,
    stateBefore: terminal.stateBefore,
    stateAfter: terminal.stateAfter,
    timeWindowSelected: terminal.timeWindow,
    durationActualSeconds: terminal.durationActualSeconds,
    outcome: terminal.outcome,
    userChosenNextStep: terminal.userChosenNextStep,
    intentPath,
    sessionStartedAt: terminal.sessionStartedAt,
  };
}

/**
 * Returns true if the outcome qualifies as a "shift" for the
 * first-shift footer trigger.
 *
 * Locked decision (sub-step 2.7): includes 'shifted' and
 * 'partial_shift' (the only transition that classifies as
 * partial_shift is wired→foggy — a genuine state transition the user
 * felt). Excludes 'maintenance' — that's "held the line," not a shift
 * in user-facing language. The footer copy uses the word "shift"
 * verbatim; calling maintenance a shift would confuse a user whose
 * re-check showed the same state they started in.
 */
export function qualifiesAsFirstShift(
  outcome: ProtocolSessionOutcome
): boolean {
  return outcome === 'shifted' || outcome === 'partial_shift';
}

/**
 * Sets `firstShiftAt` on the user profile if (a) the outcome qualifies
 * AND (b) the field is currently null/missing. Idempotent — once set,
 * subsequent qualifying sessions no-op.
 *
 * Race acknowledged: two concurrent terminal writes could both observe
 * firstShiftAt as null and both set it. Functionally impossible (one
 * user can't have two active CheckInFlow instances simultaneously) and
 * the cost of a Firestore transaction here outweighs the bug risk.
 * Revisit if a user reports an incorrect first-shift timestamp.
 *
 * Failure is non-fatal — logged and swallowed. The protocolSessions
 * write is the source of truth for whether the shift happened; the
 * footer is a UX affordance whose absence is recoverable on the next
 * qualifying session.
 */
async function setFirstShiftAtIfNeeded(
  userId: string,
  outcome: ProtocolSessionOutcome
): Promise<void> {
  if (!qualifiesAsFirstShift(outcome)) return;
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const currentFirstShiftAt = userSnap.exists()
      ? (userSnap.data() as UserProfile).firstShiftAt
      : null;
    if (currentFirstShiftAt == null) {
      await setDoc(
        userRef,
        {
          firstShiftAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    logger.error(
      '[writeStandardFlowSession] firstShiftAt write failed:',
      error
    );
  }
}

/**
 * Legacy + first-shift orchestration shared between CheckInFlow's
 * `writeStandardFlowSession` and BrowseRunFlow's terminal effect
 * (when `CheckInFlowContext` is present — round 7 Bug B follow-up).
 *
 * Three side effects, in order:
 *   1. `saveBrainStateCheckIn(userId, stateBefore)` — updates the
 *      legacy `brainStateCheckIns/{userId}_{date}` doc that the
 *      dashboard's `useDashboard.ts` reads on focus to decide
 *      "show chip picker vs show summary."
 *   2. `markProtocolCompleted(userId)` — only when `isFlowComplete`,
 *      flips the legacy doc's `protocolCompleted` flag for v1 read
 *      paths.
 *   3. `setFirstShiftAtIfNeeded(userId, outcome)` — sets the user
 *      profile's `firstShiftAt` field if the outcome qualifies
 *      (`shifted` or `partial_shift`) and the field is currently null.
 *      Drives the dashboard's first-shift footer.
 *
 * Error handling: legacy-write errors (steps 1 + 2) are caught and
 * logged but NOT surfaced. Both writes are backward-compat for
 * dashboard reads; their failure must not strand the user post-
 * completion. The first-shift call has its own internal try-catch
 * inside `setFirstShiftAtIfNeeded`. The protocolSessions write
 * (handled by the caller) is the authoritative source — Patterns
 * reads from there going forward.
 *
 * `dryRun` skips ALL three side effects.
 *
 * Idempotent at all layers: legacy doc is keyed by date (one per
 * day, updates on subsequent calls); firstShiftAt is read-then-
 * conditionally-written (no-op once set).
 */
export async function writeBrainStateCheckInLegacyEffects(
  userId: string,
  stateBefore: BrainState,
  isFlowComplete: boolean,
  outcome: ProtocolSessionOutcome,
  // Round 8 (Bug F fix): the actually-completed protocol's id.
  // Forwarded to saveBrainStateCheckIn so the legacy doc's
  // protocolId field reflects what the user ran, not a default-
  // recommended fallback. Required at every post-completion call
  // site — see saveBrainStateCheckIn's V1 vestige warning for the
  // bug class this prevents.
  protocolId: string,
  options: { dryRun?: boolean } = {}
): Promise<void> {
  if (options.dryRun) {
    logger.log(
      '[writeBrainStateCheckInLegacyEffects] dryRun — would update legacy brainStateCheckIns + maybe firstShiftAt'
    );
    return;
  }

  try {
    await saveBrainStateCheckIn(userId, stateBefore, protocolId);
    if (isFlowComplete) {
      // Only naturally-completed sessions mark the legacy
      // protocolCompleted flag. Abandoned sessions update the
      // brainState but leave protocolCompleted=false (or unchanged
      // from a previous same-day successful completion — setDoc
      // semantics in saveBrainStateCheckIn handle that).
      await markProtocolCompleted(userId);
    }
  } catch (error) {
    // Legacy write failure shouldn't block the new write succeeding.
    // Log + swallow — Patterns reads from protocolSessions going
    // forward; the legacy doc is for v1 surfaces only.
    logger.error(
      '[writeBrainStateCheckInLegacyEffects] legacy brainStateCheckIns write failed:',
      error
    );
  }

  // First-shift footer trigger. Independent failure mode from the
  // legacy write — a profile write hiccup shouldn't affect Patterns
  // data integrity, and vice versa. setFirstShiftAtIfNeeded handles
  // its own try-catch internally and gates on
  // qualifiesAsFirstShift(outcome) — passing 'maintenance' /
  // 'browse_launched' / 'abandoned' is a safe no-op.
  await setFirstShiftAtIfNeeded(userId, outcome);
}

/**
 * Writes both the new `protocolSessions` doc (authoritative) AND
 * triggers the legacy + first-shift side effects via
 * `writeBrainStateCheckInLegacyEffects`. Call from CheckInFlow's
 * terminal useEffect.
 *
 * Round 7 update: BrowseRunFlow's terminal now ALSO calls
 * `writeBrainStateCheckInLegacyEffects` when its `CheckInFlowContext`
 * is present (Bug A v2 fix — BrowseRunFlow with context routes to
 * dashboard, which reads the legacy collection). BrowseRunFlow does
 * NOT call this `writeStandardFlowSession` helper because the
 * standard CheckInFlow's terminal type (`TerminalFlowState`)
 * requires fields BrowseRunFlow's terminal lacks (`entrySource`,
 * `playerExitReason`, `userChosenNextStep`). Sharing the legacy
 * orchestration via the helper avoids constructing a synthetic
 * `TerminalFlowState`.
 *
 * Idempotent at all layers: protocolSessions doc is keyed by
 * `${userId}_${sessionStartedAt}` (one per session, no-op on retry);
 * legacy and first-shift idempotency described in the helper above.
 *
 * `dryRun` skips ALL writes (new + legacy + firstShiftAt) — keeps
 * Firestore clean of dev-harness pollution.
 */
// Caller may attach a `selectedModality` to be persisted on the
// session doc. Used by the brief-movement family to record the
// user's pre-timer Walk vs Stretch choice. Optional — protocols
// without a modality picker omit it; the writer skips the field
// entirely when null/undefined.
export interface WriteStandardFlowSessionOptions
  extends WriteProtocolSessionOptions {
  selectedModality?: MovementModality | null;
}

export async function writeStandardFlowSession(
  userId: string,
  terminal: TerminalFlowState,
  intentPath: IntentPath,
  options: WriteStandardFlowSessionOptions = {}
): Promise<void> {
  const payload = mapStandardFlowTerminalToPayload(terminal, intentPath);
  if (options.selectedModality != null) {
    payload.selectedModality = options.selectedModality;
  }

  // New authoritative write.
  await writeProtocolSession(userId, payload, options);

  // Legacy + first-shift orchestration. dryRun is forwarded so the
  // helper is a single source of truth for the bypass. terminal.protocol.id
  // is the user's actually-completed protocol — passing it explicitly
  // prevents the round-8 Bug F latent symptom (legacy doc carrying a
  // default-recommended id instead of the run id).
  await writeBrainStateCheckInLegacyEffects(
    userId,
    terminal.stateBefore,
    terminal.step === 'flow_complete',
    payload.outcome,
    terminal.protocol.id,
    { dryRun: options.dryRun }
  );
}

/**
 * Fetch brain state check-in history for the last N days.
 * For use in insights and correlation analysis.
 */
export const getBrainStateHistory = async (
  userId: string,
  days: number = 7
): Promise<BrainStateCheckIn[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(days)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => toBrainStateCheckIn(d.id, d.data()))
      .filter((checkIn): checkIn is BrainStateCheckIn => checkIn !== null);
  } catch (error) {
    logger.error('Error getting brain state history:', error);
    return [];
  }
};
