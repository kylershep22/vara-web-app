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
import type { IntentPath } from '../../types/models';
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
 * Automatically maps the brain state to the corresponding protocol.
 */
export const saveBrainStateCheckIn = async (
  userId: string,
  brainState: BrainState
): Promise<BrainStateCheckIn> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    // Sub-step 2.5 — getProtocolForState was deleted; the legacy doc
    // continues to carry a protocolId field for v1 read paths
    // (Dashboard's TodaysProtocolCard). Use the new recommender with
    // a 5-min default time window — the legacy single-tap pattern
    // didn't capture a window, and 5min is the spec's "meaningful
    // shift" tier (Core Loop v2 step 2). Phase 5 migrations remove
    // this legacy doc field entirely; until then this protocolId is
    // display-only.
    const protocol = selectProtocol({ state: brainState, timeWindow: 5 });

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
        protocolId: protocol.id,
        // Only reset protocol completion if brain state actually changed
        ...(stateChanged && { protocolCompleted: false }),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        ...existingData,
        brainState,
        protocolId: protocol.id,
        ...(stateChanged && { protocolCompleted: false }),
      } as BrainStateCheckIn;
    } else {
      await setDoc(docRef, {
        userId,
        date: todayDate,
        brainState: serializedState,
        protocolId: protocol.id,
        protocolCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: checkInId,
        userId,
        date: todayDate,
        brainState,
        protocolId: protocol.id,
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
 * Writes both the new `protocolSessions` doc (authoritative) AND
 * updates the legacy `brainStateCheckIns/{userId}_{date}` doc
 * (backward compat for v1 read paths still on Today / Patterns /
 * Dashboard surfaces). Call from CheckInFlow's terminal useEffect.
 *
 * BrowseRunFlow does NOT use this — Case 4 sessions skip the legacy
 * write because browse-launched sessions didn't exist in v1; there's
 * no backward-compat data dependency. BrowseRunFlow calls
 * `writeProtocolSession` directly.
 *
 * Fire-and-forget at the call site (UX shouldn't block on Firestore).
 *
 * Idempotent at both layers: legacy doc is keyed by date (one per
 * day, updates on subsequent calls); protocolSessions doc is keyed by
 * `${userId}_${sessionStartedAt}` (one per session, no-op on retry).
 *
 * `dryRun` skips ALL writes (both new and legacy) — keeps both
 * collections clean of dev-harness pollution.
 */
export async function writeStandardFlowSession(
  userId: string,
  terminal: TerminalFlowState,
  intentPath: IntentPath,
  options: WriteProtocolSessionOptions = {}
): Promise<void> {
  // New authoritative write.
  await writeProtocolSession(
    userId,
    mapStandardFlowTerminalToPayload(terminal, intentPath),
    options
  );

  if (options.dryRun) {
    logger.log(
      '[writeStandardFlowSession] dryRun — would also update legacy brainStateCheckIns'
    );
    return;
  }

  // Legacy parallel writes. Only standard-flow has a stateBefore;
  // BrowseRunFlow never reaches this helper.
  try {
    await saveBrainStateCheckIn(userId, terminal.stateBefore);
    if (terminal.step === 'flow_complete') {
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
      '[writeStandardFlowSession] legacy brainStateCheckIns write failed:',
      error
    );
  }
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
