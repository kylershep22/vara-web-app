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

import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import type { Quadrant, Situation } from '../../engine';
import type { BrainState, IntentPath } from '../../types/models';
import type {
  MovementModality,
  ProtocolAbandonReason,
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
  // Optional completion telemetry forwarded from the GuidedSessionPlayer
  // summary (currently the onboarding protocol step). Additive: lets a query
  // distinguish a fully-played session from an early exit / audio failure
  // without changing the existing `outcome` field. Callers that don't supply
  // these omit them, so the doc shape is unchanged for non-onboarding writes.
  completed?: boolean;
  abandonReason?: ProtocolAbandonReason | null;
  stepsCompleted?: number;
  // Engine-wired check-in fields (Vara_Engine_Contract.md). The circumplex +
  // situation + reflection are the AUTHORITATIVE state read on protocolSessions
  // (the legacy `brainStateCheckIns` doc carries a bridged BrainState; this doc
  // does not). Additive + optional: the BrowseRunFlow / onboarding writers omit
  // them, so the doc shape is unchanged for non-engine sessions.
  situation?: string;
  arousal?: string;
  valence?: string;
  quadrant?: string;
  reflectionId?: string | null;
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

// ── Read: today's latest engine state read ──────────────────────────
//
// The dashboard's "Right now: [state]" acknowledgment is derived from the
// circumplex quadrant (+ situation), which is AUTHORITATIVE on protocolSessions
// (the legacy brainStateCheckIns doc carries only a bridged BrainState). This
// read returns the most recent of today's sessions that actually carries both
// `quadrant` and `situation` — overwhelm-entry and browse-launched docs omit
// them, so we skip those and keep scanning rather than `limit 1` blindly.

// The four valid circumplex quadrants and six situations, used to validate the
// loosely-typed (string) fields stored on the doc before narrowing.
const VALID_QUADRANTS: ReadonlySet<string> = new Set<Quadrant>([
  'Tense',
  'Activated',
  'Depleted',
  'Calm',
]);
const VALID_SITUATIONS: ReadonlySet<string> = new Set<Situation>([
  'get_through_hard',
  'quiet_mind',
  'find_energy',
  'wind_down',
  'grip_on_day',
  'just_reset',
]);

export interface TodayEngineSession {
  quadrant: Quadrant;
  situation: Situation;
}

// Start of the local calendar day, derived the same way getTodayDate() derives
// the day-key (local Y/M/D), so the query boundary and the brainStateCheckIns
// day-key never disagree across a timezone.
function startOfLocalToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Returns the quadrant + situation from the most recent of today's
 * protocolSessions that has BOTH fields populated, or null if none qualifies
 * (e.g. only overwhelm/browse sessions today). Fetches the latest ~5 of today's
 * docs (createdAt desc) and returns the first qualifying one — a `limit 1` could
 * land on a fields-omitted overwhelm/browse doc and miss a real check-in.
 *
 * Requires the composite index (userId ASC, createdAt DESC) on protocolSessions.
 */
export async function getTodayLatestEngineSession(
  userId: string
): Promise<TodayEngineSession | null> {
  if (!db) return null;
  try {
    const start = Timestamp.fromDate(startOfLocalToday());
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('createdAt', '>=', start),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const quadrant = data.quadrant;
      const situation = data.situation;
      if (
        typeof quadrant === 'string' &&
        typeof situation === 'string' &&
        VALID_QUADRANTS.has(quadrant) &&
        VALID_SITUATIONS.has(situation)
      ) {
        return {
          quadrant: quadrant as Quadrant,
          situation: situation as Situation,
        };
      }
    }
    return null;
  } catch (error) {
    logger.error(
      '[protocolSession.service] getTodayLatestEngineSession failed:',
      error
    );
    return null;
  }
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
        // Additive completion telemetry. Written only when the caller supplies
        // them (`!== undefined`), so `false`/`null` are still recorded for
        // onboarding while other callers leave the doc shape unchanged.
        ...(payload.completed !== undefined ? { completed: payload.completed } : {}),
        ...(payload.abandonReason !== undefined ? { abandonReason: payload.abandonReason } : {}),
        ...(payload.stepsCompleted !== undefined ? { stepsCompleted: payload.stepsCompleted } : {}),
        // Engine-wired authoritative state fields (additive — omitted entirely
        // for non-engine writers so historical doc shape is unchanged).
        ...(payload.situation !== undefined ? { situation: payload.situation } : {}),
        ...(payload.arousal !== undefined ? { arousal: payload.arousal } : {}),
        ...(payload.valence !== undefined ? { valence: payload.valence } : {}),
        ...(payload.quadrant !== undefined ? { quadrant: payload.quadrant } : {}),
        ...(payload.reflectionId !== undefined ? { reflectionId: payload.reflectionId } : {}),
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
