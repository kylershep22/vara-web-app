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
 * Round 14 split (was step 1 + 2 of writeBrainStateCheckInLegacyEffects).
 * Writes the legacy `brainStateCheckIns/{userId}_{date}` doc — the
 * dashboard's "user-attested state for today" record. Updates
 * brainState + protocolId, and on natural completion flips
 * protocolCompleted via markProtocolCompleted.
 *
 * Why split: the previous combined helper conflated two semantically
 * distinct concerns. Round 14 surfaced that the overwhelm path's
 * stateBefore is a system guess ('wired' hardcoded in initFlow),
 * not a user attestation — writing it to this collection clobbered
 * the user's actual most-recent check-in. The fix needs to skip
 * the doc write for overwhelm sessions while still triggering the
 * first-shift marker (which tracks state transitions in
 * protocolSessions data, not attestations). That's two different
 * gating conditions on what was previously one orchestration step,
 * so we split into two named helpers.
 *
 * Round 15 parameter rename: was `stateBefore`, now `state`. The
 * helper writes whatever brain-state value the caller passes; it is
 * NOT specifically the pre-protocol state. Round 15's bug fix made
 * callers pass the most-recent attestation (stateAfter for completed
 * sessions, stateBefore for abandoned), so the parameter name needed
 * to stop encoding the pre-protocol assumption.
 *
 * Error handling: write errors are caught and logged but NOT
 * surfaced. The legacy doc is for v1 dashboard reads only; failure
 * must not strand the user post-completion. The protocolSessions
 * write (the caller's responsibility) is the authoritative source.
 *
 * `dryRun` skips both writes.
 *
 * Idempotent: legacy doc is keyed by date (one per day; updates on
 * subsequent calls).
 */
export async function writeBrainStateCheckInDoc(
  userId: string,
  state: BrainState,
  isFlowComplete: boolean,
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
      '[writeBrainStateCheckInDoc] dryRun — would update legacy brainStateCheckIns'
    );
    return;
  }

  try {
    await saveBrainStateCheckIn(userId, state, protocolId);
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
      '[writeBrainStateCheckInDoc] legacy brainStateCheckIns write failed:',
      error
    );
  }
}

/**
 * Round 14 split (was step 3 of writeBrainStateCheckInLegacyEffects).
 * Sets the user profile's firstShiftAt field if the outcome
 * qualifies (shifted / partial_shift) AND the field is currently
 * null. Drives the dashboard's first-shift footer.
 *
 * Independent of writeBrainStateCheckInDoc: the first-shift marker
 * tracks state transitions in protocolSessions data (a real
 * measured shift), not user attestations. Overwhelm sessions that
 * produce qualifying outcomes still mark — even though their
 * stateBefore is a system guess, the resulting transition is real
 * and recorded in protocolSessions.
 *
 * Internal try-catch inside setFirstShiftAtIfNeeded handles its own
 * failure mode (logs + swallows). qualifiesAsFirstShift gates the
 * profile read so non-qualifying outcomes ('maintenance' /
 * 'browse_launched' / 'abandoned') are safe no-ops.
 *
 * `dryRun` skips the call entirely.
 */
export async function maybeMarkFirstShift(
  userId: string,
  outcome: ProtocolSessionOutcome,
  options: { dryRun?: boolean } = {}
): Promise<void> {
  if (options.dryRun) {
    logger.log(
      '[maybeMarkFirstShift] dryRun — would conditionally set firstShiftAt'
    );
    return;
  }
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

  // Round 14 (sensory reset cancel state-revert fix): the overwhelm
  // path's stateBefore is a system guess ('wired' hardcoded in
  // initFlow at reducer.ts:76-84), not a user attestation. Writing
  // it to the legacy brainStateCheckIns collection clobbered the
  // user's actual most-recent check-in for the day (and reset
  // protocolCompleted to false because saveBrainStateCheckIn's
  // stateChanged branch fires when the guessed 'wired' differs from
  // the user's prior attested state). The protocolSessions write
  // above is the authoritative source — Patterns reads from there.
  //
  // First-shift marker stays for both paths because it tracks state
  // transitions in protocolSessions data, not user attestations.
  // An overwhelm session that produces a qualifying outcome
  // (e.g. wired→steady = shifted) is a real measured shift even if
  // the start state was guessed.
  //
  // See PHASE_NOTES round 14 + TECH_DEBT entry on Option C
  // (replacing the hardcoded stateBefore with a re-check capture
  // pattern that lets overwhelm sessions write a user-attested
  // stateBefore — the longer-term direction that makes this
  // special-case branch deletable).
  if (terminal.entrySource !== 'overwhelm_safety_card') {
    // Round 15 (dashboard summary card stateBefore-vs-stateAfter fix):
    // the legacy doc represents the user's CURRENT state for today —
    // what the dashboard summary card and the AI prompt both render
    // as "the user's brain state right now." Pre-fix, this helper
    // received terminal.stateBefore, so the doc held the user's
    // pre-protocol state even after a successful re-check. Dashboard
    // showed the start state instead of the post-protocol state.
    //
    // Fix: pass the user's most-recent attestation. For
    // flow_complete, that's stateAfter (captured at re-check). For
    // abandoned, only stateBefore is available (re-check never ran).
    //
    // Why step-based conditional (not `terminal.stateAfter ??
    // terminal.stateBefore`): the AbandonedStep type omits stateAfter
    // entirely (types.ts:190-204 — "stateAfter is unset because we
    // never asked"). Accessing terminal.stateAfter without
    // discriminant narrowing fails strict-mode TS because the
    // property is absent from one variant of the union. The
    // step-based form gets clean narrowing for free.
    const stateForLegacyDoc =
      terminal.step === 'flow_complete'
        ? terminal.stateAfter
        : terminal.stateBefore;
    await writeBrainStateCheckInDoc(
      userId,
      stateForLegacyDoc,
      terminal.step === 'flow_complete',
      terminal.protocol.id,
      { dryRun: options.dryRun }
    );
  }
  await maybeMarkFirstShift(userId, payload.outcome, {
    dryRun: options.dryRun,
  });
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
