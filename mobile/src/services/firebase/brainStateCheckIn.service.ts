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
import { quadrantToBrainState } from '../../engine';
import type { Quadrant, Situation } from '../../engine';

// Raw circumplex state forwarded onto the daily marker so the dashboard
// acknowledgment can read it regardless of whether a practice ran.
type CheckInStateFields = { quadrant?: Quadrant; situation?: Situation };
import { classifyReflectionOutcome } from '../outcomeClassifier';
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
  protocolId?: string,
  // Raw circumplex state to stamp onto the marker (in addition to the bridged
  // brainState) so the dashboard acknowledgment can read the real quadrant.
  // Written conditionally so a caller without it never clobbers a quadrant an
  // earlier same-day check-in already stored.
  stateFields: CheckInStateFields = {}
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
    const statePatch = {
      ...(stateFields.quadrant !== undefined ? { quadrant: stateFields.quadrant } : {}),
      ...(stateFields.situation !== undefined ? { situation: stateFields.situation } : {}),
    };

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
        ...statePatch,
        // Only reset protocol completion if brain state actually changed
        ...(stateChanged && { protocolCompleted: false }),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        ...existingData,
        brainState,
        protocolId: resolvedProtocolId,
        ...statePatch,
        ...(stateChanged && { protocolCompleted: false }),
      } as BrainStateCheckIn;
    } else {
      await setDoc(docRef, {
        userId,
        date: todayDate,
        brainState: serializedState,
        protocolId: resolvedProtocolId,
        protocolCompleted: false,
        ...statePatch,
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
        ...statePatch,
      } as BrainStateCheckIn;
    }
  } catch (error) {
    logger.error('Error saving brain state check-in:', error);
    throw error;
  }
};

/**
 * Onboarding bridge: persist the onboarding re-check brain state as today's
 * first daily check-in, so the dashboard's gated-until-check-in logic doesn't
 * immediately re-ask a user who just attested their state in the re-check step.
 *
 * Writes the standard brainStateCheckIns shape plus a `source` tag for
 * analytics differentiation. Create-if-absent: never clobbers an existing
 * same-day check-in (a brand-new completer has none, but this stays safe on
 * resume). Errors are logged and swallowed — a failed write must not strand the
 * user on the terminal onboarding screen.
 *
 * The caller is responsible for the skip guard: if the user skipped / never
 * reached re-check (no persisted state), this is simply not called.
 */
export const saveOnboardingRecheckCheckIn = async (
  userId: string,
  brainState: BrainState
): Promise<void> => {
  if (!db) return;
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);

    const existing = await getDoc(docRef);
    if (existing.exists()) return; // don't overwrite a real check-in

    // protocolId mirrors a standard fresh check-in: the recommended protocol
    // for the attested state (not a completed run). Defensive fallback keeps
    // the write resilient if selectProtocol ever throws in __DEV__.
    let protocolId = 'cyclic-sighing-2';
    try {
      protocolId = selectProtocol({ state: brainState, timeWindow: 5 }).id;
    } catch {
      // keep the fallback
    }

    await setDoc(docRef, {
      userId,
      date: todayDate,
      brainState: serializeBrainState(brainState),
      protocolId,
      protocolCompleted: false,
      source: 'onboarding_recheck',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error writing onboarding-recheck check-in:', error);
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
 * Maps an engine-wired CheckInFlow terminal state to the ProtocolSession write
 * payload. Pure — extracted for unit-testability without mocking Firestore.
 *
 * Returns `null` when there is nothing to persist: pointer-only hand-off and
 * zero-slot / declined-offer (acknowledged) terminals never ran a catalog
 * practice, so no ProtocolSession doc is written for them.
 *
 * The circumplex + situation + reflection are authoritative on the doc;
 * `stateBefore`/`stateAfter` are left null (the legacy `brainStateCheckIns` doc
 * carries the bridged BrainState instead). Outcome + firstShift come from the
 * reflection (Vara_Engine_Contract.md §9.6).
 */
export function mapStandardFlowTerminalToPayload(
  terminal: TerminalFlowState,
  intentPath: IntentPath
): ProtocolSessionWritePayload | null {
  if (terminal.step === 'abandoned') {
    return {
      protocolId: terminal.protocol.id,
      stateBefore: null,
      stateAfter: null,
      timeWindowSelected: terminal.timeWindow,
      durationActualSeconds: terminal.durationActualSeconds,
      outcome: 'abandoned',
      userChosenNextStep: null,
      intentPath,
      sessionStartedAt: terminal.sessionStartedAt,
      situation: terminal.situation,
      arousal: terminal.arousal,
      valence: terminal.valence,
      quadrant: terminal.quadrant,
      reflectionId: null,
    };
  }

  // step === 'flow_complete'. Only a completed catalog practice is persisted.
  const completion = terminal.completion;
  if (completion.kind !== 'practice') {
    return null;
  }
  const { outcome } = classifyReflectionOutcome(
    completion.pillar,
    completion.direction,
    completion.reflection
  );
  return {
    protocolId: completion.protocol.id,
    stateBefore: null,
    stateAfter: null,
    timeWindowSelected: terminal.timeWindow,
    durationActualSeconds: completion.durationActualSeconds,
    outcome,
    userChosenNextStep: null,
    intentPath,
    sessionStartedAt: completion.sessionStartedAt,
    situation: terminal.situation,
    arousal: terminal.arousal,
    valence: terminal.valence,
    quadrant: terminal.quadrant,
    reflectionId: completion.reflection,
  };
}

// Whether a terminal qualifies for the firstShiftAt marker — true ONLY on the
// strong-positive reflection chip (locked Phase B decision). Abandoned and
// pointer-only / acknowledged terminals never qualify.
function terminalQualifiesFirstShift(terminal: TerminalFlowState): boolean {
  if (terminal.step !== 'flow_complete') return false;
  const c = terminal.completion;
  if (c.kind !== 'practice') return false;
  return classifyReflectionOutcome(c.pillar, c.direction, c.reflection)
    .qualifiesFirstShift;
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
  qualifies: boolean
): Promise<void> {
  if (!qualifies) return;
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
  //
  // Optional in the engine wiring: a pointer-only / zero-slot check-in flips
  // the daily marker without having run a catalog practice, so there is no
  // completed protocol id to forward. When omitted, the marker is written
  // WITHOUT a protocolId (and without re-invoking the legacy state→protocol
  // selector): the only reader of brainStateCheckIns.protocolId is the
  // dashboard's TodaysProtocolCard, which renders only when
  // protocolCompleted===true (i.e. a practice actually ran), so a no-practice
  // marker must not name a protocol that wasn't done.
  protocolId?: string,
  options: { dryRun?: boolean } & CheckInStateFields = {}
): Promise<void> {
  if (options.dryRun) {
    logger.log(
      '[writeBrainStateCheckInDoc] dryRun — would update legacy brainStateCheckIns'
    );
    return;
  }

  const stateFields: CheckInStateFields = {
    ...(options.quadrant !== undefined ? { quadrant: options.quadrant } : {}),
    ...(options.situation !== undefined ? { situation: options.situation } : {}),
  };

  try {
    if (protocolId !== undefined) {
      await saveBrainStateCheckIn(userId, state, protocolId, stateFields);
      if (isFlowComplete) {
        // Only naturally-completed sessions mark the legacy
        // protocolCompleted flag. Abandoned sessions update the
        // brainState but leave protocolCompleted=false (or unchanged
        // from a previous same-day successful completion — setDoc
        // semantics in saveBrainStateCheckIn handle that).
        await markProtocolCompleted(userId);
      }
    } else {
      // No practice ran (pointer-only / zero-slot): flip the daily marker
      // with the attested state only. No protocolId, no selectProtocol, no
      // protocolCompleted flip.
      await upsertCheckInMarker(userId, state, stateFields);
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
 * Writes the daily `brainStateCheckIns/{uid}_{date}` marker with the attested
 * brainState ONLY — no protocolId, no selectProtocol fallback,
 * protocolCompleted left false. Used by the engine-wired check-in for
 * pointer-only / zero-slot terminals so "checked-in today" flips without naming
 * a practice that wasn't run. Create-or-update; on update an existing
 * protocolId/protocolCompleted from an earlier same-day completion is left
 * untouched (only reset on an actual state change).
 */
async function upsertCheckInMarker(
  userId: string,
  brainState: BrainState,
  stateFields: CheckInStateFields = {}
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const docRef = doc(db, COLLECTION, checkInId);
  const serializedState = serializeBrainState(brainState);
  const statePatch = {
    ...(stateFields.quadrant !== undefined ? { quadrant: stateFields.quadrant } : {}),
    ...(stateFields.situation !== undefined ? { situation: stateFields.situation } : {}),
  };

  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    const existingData = existingDoc.data();
    let existingBrainState: BrainState | null = null;
    try {
      existingBrainState = normalizeBrainState(existingData.brainState as string);
    } catch {
      existingBrainState = null;
    }
    const stateChanged = existingBrainState !== brainState;
    await updateDoc(docRef, {
      brainState: serializedState,
      ...statePatch,
      ...(stateChanged && { protocolCompleted: false }),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      userId,
      date: todayDate,
      brainState: serializedState,
      protocolCompleted: false,
      ...statePatch,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
  await setFirstShiftAtIfNeeded(userId, qualifiesAsFirstShift(outcome));
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

  // Authoritative protocolSession write (circumplex + situation + reflection)
  // — ONLY when a catalog practice ran. Pointer-only hand-off and zero-slot /
  // declined-offer terminals have no practice, so the mapper returns null and
  // nothing is persisted here. The daily marker below still fires for them.
  if (payload !== null) {
    if (options.selectedModality != null) {
      payload.selectedModality = options.selectedModality;
    }
    await writeProtocolSession(userId, payload, options);
  }

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
  // Daily "checked-in today" marker (legacy `brainStateCheckIns/{uid}_{date}`).
  // Decoupled from practice completion: written on EVERY non-overwhelm terminal
  // where a state was captured — practice-complete, pointer hand-off, AND
  // zero-slot / acknowledged — so the dashboard gating flips for any real
  // check-in, not just ones that ran a practice. A single write per terminal
  // (the practice path no longer writes its own legacy doc separately, so there
  // is no double-write). The engine speaks the circumplex; the marker bridges
  // the quadrant to a BrainState here (the protocolSessions write stays
  // authoritative on the circumplex). The legacy collection is flagged for
  // later removal once dashboard reads migrate off it.
  //
  // Overwhelm is still skipped — its state is a system guess, not a user
  // attestation (round-14 sensory-reset cancel fix).
  if (terminal.entrySource !== 'overwhelm_safety_card') {
    const practiceCompleted =
      terminal.step === 'flow_complete' &&
      terminal.completion.kind === 'practice';
    await writeBrainStateCheckInDoc(
      userId,
      quadrantToBrainState(terminal.quadrant),
      // protocolCompleted flips ONLY when a catalog practice actually
      // completed; pointer-only / zero-slot / abandoned leave it false.
      practiceCompleted,
      // The completed/ran practice id when there is one; undefined for
      // pointer-only / zero-slot, where the marker is written WITHOUT a
      // protocolId (no selectProtocol re-invocation, no naming a practice that
      // wasn't done — see writeBrainStateCheckInDoc).
      terminalPracticeId(terminal),
      // Raw circumplex stamped onto the marker so the dashboard "Right now"
      // acknowledgment reflects the real quadrant on EVERY terminal — including
      // pointer hand-offs (focus session) and zero-slot / acknowledged
      // terminals that never write a protocolSessions doc.
      {
        dryRun: options.dryRun,
        quadrant: terminal.quadrant,
        situation: terminal.situation,
      }
    );
  }

  // firstShiftAt qualifies ONLY on the strong-positive reflection chip (locked
  // Phase B decision) — not derived from the outcome enum.
  if (!options.dryRun) {
    await setFirstShiftAtIfNeeded(userId, terminalQualifiesFirstShift(terminal));
  }
}

// The catalog practice id involved in this terminal, or undefined when none
// ran. abandoned carries the abandoned practice; a practice completion carries
// the completed one; pointer-only / zero-slot / acknowledged have none.
function terminalPracticeId(terminal: TerminalFlowState): string | undefined {
  if (terminal.step === 'abandoned') return terminal.protocol.id;
  if (terminal.completion.kind === 'practice') {
    return terminal.completion.protocol.id;
  }
  return undefined;
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
