// Protocol Session Service
//
// Authoritative writer for the `protocolSessions` Firestore collection
// — the data source the Patterns algorithm reads starting in Phase 2.
//
// Doc ID format: `${userId}_${sessionStartedAt}` where
// sessionStartedAt is the millisecond integer (Date.now() shape, not
// an ISO string). Idempotent under network retries / accidental
// double-fires of CheckInFlow's onComplete — setDoc with merge
// produces a no-op for identical payloads. Deviation from the Phase 0
// doc-ID-convention note ("auto-generated IDs"); the rationale
// (multiple sessions per user per day) is met because each session
// has a distinct `sessionStartedAt`.
//
// Used by:
//   - `writeStandardFlowSession` in `brainStateCheckIn.service.ts`
//     (parallel-write helper for CheckInFlow's standard flow).
//   - `BrowseRunFlow` directly (Case 4 — no legacy brainStateCheckIns
//     write because browse-launched sessions didn't exist in v1).

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import type { BrainState, IntentPath } from '../../types/models';
import type {
  MovementModality,
  ProtocolNextStep,
  ProtocolSessionOutcome,
  ProtocolTimeWindow,
} from '../../types/models';

const COLLECTION = 'protocolSessions';

// Plain payload the writer accepts. Times are ms-since-epoch
// integers; Firestore Timestamps are constructed at write time via
// `serverTimestamp()`. Callers (CheckInFlow / BrowseRunFlow) build
// this from their respective terminal `FlowState` payloads via the
// per-flow mapper; the writer itself is flow-agnostic.
export interface ProtocolSessionWritePayload {
  protocolId: string;
  // Browse-launched sessions (Case 4) have stateBefore=null because
  // no pre-protocol check-in was captured.
  stateBefore: BrainState | null;
  // Null if the session was abandoned mid-protocol (re-check never
  // ran).
  stateAfter: BrainState | null;
  timeWindowSelected: ProtocolTimeWindow;
  durationActualSeconds: number;
  outcome: ProtocolSessionOutcome;
  userChosenNextStep: ProtocolNextStep | null;
  intentPath: IntentPath;
  // ms since epoch — used to build the doc ID.
  sessionStartedAt: number;
  // Optional. Present only for protocols that surface a pre-timer
  // modality picker (currently the brief-movement family — see
  // LightMovementProtocolFlow). Forward-only: existing session docs
  // predate this feature and lack the field. Patterns queries should
  // null-check before grouping by modality.
  selectedModality?: MovementModality | null;
}

export interface WriteProtocolSessionOptions {
  // When true, skip the Firestore call entirely and log the payload
  // via logger.log. Used by the dev harness to avoid polluting the
  // production schema with harness data. Production callers omit
  // this (defaults to false, real write).
  dryRun?: boolean;
}

function buildDocId(
  userId: string,
  sessionStartedAt: number
): string {
  return `${userId}_${sessionStartedAt}`;
}

/**
 * Writes one ProtocolSession Firestore doc.
 *
 * Idempotent: same (userId, sessionStartedAt) overwrites the same doc
 * with merge semantics. Network retries and accidental double-fires
 * of `onComplete` produce no duplicate records.
 *
 * Fire-and-forget at the call site (UX shouldn't block on Firestore).
 * Errors are logged via `logger.error` and re-thrown so callers can
 * decide whether to surface them.
 */
export async function writeProtocolSession(
  userId: string,
  payload: ProtocolSessionWritePayload,
  options: WriteProtocolSessionOptions = {}
): Promise<void> {
  if (options.dryRun) {
    logger.log('[protocolSession.service] dryRun — would write payload:', {
      userId,
      ...payload,
      docId: buildDocId(userId, payload.sessionStartedAt),
    });
    return;
  }

  if (!db) {
    throw new Error(
      '[protocolSession.service] Firestore not initialized — cannot write session'
    );
  }

  try {
    const docId = buildDocId(userId, payload.sessionStartedAt);
    const ref = doc(db, COLLECTION, docId);
    await setDoc(
      ref,
      {
        userId,
        protocolId: payload.protocolId,
        stateBefore: payload.stateBefore,
        stateAfter: payload.stateAfter,
        timeWindowSelected: payload.timeWindowSelected,
        durationActualSeconds: payload.durationActualSeconds,
        outcome: payload.outcome,
        userChosenNextStep: payload.userChosenNextStep,
        intentPath: payload.intentPath,
        // Optional field — only included when the caller supplied a
        // value. Omitted entirely (not written as null) for protocols
        // without a modality picker so historical doc shape stays
        // unchanged for non-light-movement sessions.
        ...(payload.selectedModality != null
          ? { selectedModality: payload.selectedModality }
          : {}),
        // Server-side timestamps so multi-device clocks don't skew
        // ordering. sessionStartedAt is the device-local moment the
        // session began; createdAt is when the doc landed in Firestore.
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.error('[protocolSession.service] write failed:', error);
    throw error;
  }
}
