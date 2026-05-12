// AsyncStorage marker for re_check force-quit recovery.
//
// Sub-step 2.7 — bridges the gap between successful player exit and
// re_check completion. The Phase 1 sessionMarker handles mid-protocol
// force-quit; this marker handles force-quit AFTER the player exits
// successfully but BEFORE the user picks a stateAfter on the re_check
// screen.
//
// Failure mode this prevents:
//   1. User finishes protocol → re_check screen mounts.
//   2. User force-quits the app (or OS terminates it) before tapping
//      a state chip.
//   3. Without this marker: stateBefore was captured pre-protocol but
//      stateAfter is gone, no protocolSessions doc gets written, and
//      Patterns loses the state-transition data the protocol
//      produced. The session is effectively unrecorded.
//
// Recovery flow:
//   - CheckInFlow's terminal-effect writes this marker on entry to
//     re_check (running → re_check transition with reason='completed').
//   - Marker cleared on entry to response (state_after_selected) AND
//     on entry to either terminal step (defensive).
//   - On next mount, CheckInFlowScreen reads the marker via
//     `readMarkerForRecoveryOffer` (which handles expiry + one-shot
//     guard) and, if eligible, mounts CheckInFlow at recovery_confirm
//     instead of the normal entry step.
//
// Marker payload includes everything needed to materialize a
// re_check-step FlowState on recovery. Protocol is stored as id only;
// the live Protocol object is resolved by the caller before passing
// to initFlow (the reducer's lazy initializer can't safely throw on
// retired protocols).
//
// One-shot semantics:
//   `recoveryOfferedAt` is set when the recovery prompt is shown to
//   the user. On the next mount, a marker with `recoveryOfferedAt !==
//   null` is silently cleared instead of looped through the prompt
//   again. This bounds the "force-quit during recovery_confirm UI"
//   case at exactly one recovery offer per marker — no recursive
//   recovery flow. The session data is lost in that scenario, but
//   the user is not stuck.
//
// Module is deliberately storage-only:
//   - Doesn't import the protocol library (utils → constants
//     direction stays one-way; a marker referencing a retired
//     protocolId still parses, the caller decides the policy).
//   - All async methods swallow AsyncStorage errors with a warning —
//     marker tracking is opportunistic, never fatal to the flow.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  BrainState,
  IntentPath,
  ProtocolTimeWindow,
} from '../types/models';
import type { FlowEntrySource } from '../components/checkin/flow/types';
import { logger } from './logger';

const STORAGE_KEY = '@vara/flowSessionInProgress';

// 30 minutes per locked decision (a)1 from sub-step 2.7 entry. Beyond
// this, the captured stateBefore is no longer a meaningful comparison
// anchor — protocol effects fade within ~20 minutes, so a re-check at
// 30+ minutes is measuring life-happening, not the protocol. Data
// integrity (Build Guide §1: state transitions are the atomic unit
// of value) outranks the recovery convenience.
const MAX_AGE_MS = 30 * 60 * 1000;

export interface FlowSessionMarker {
  // 7 fields per the user-locked recoveredPayload spec —
  protocolId: string;
  stateBefore: BrainState;
  timeWindowSelected: ProtocolTimeWindow;
  sessionStartedAt: number;
  sessionEndedAt: number;
  durationActualSeconds: number;
  intentPath: IntentPath;
  // Two additional fields beyond the user spec —
  //
  // entrySource: forward-compat for Phase 5's Overwhelm-specific
  //   not-shifted copy. The recovered re_check needs to know its
  //   original entry source so ResponseStepView/NotShiftedResponse
  //   can branch on overwhelm_safety_card downstream. Without this
  //   the recovered Overwhelm session would silently fall back to
  //   standard not-shifted copy — a Phase 5 bug we can prevent now.
  entrySource: FlowEntrySource;
  //
  // recoveryOfferedAt: one-shot guard. Set when the recovery prompt
  //   is offered (by readMarkerForRecoveryOffer). Subsequent mounts
  //   that see a non-null value clear the marker silently instead of
  //   re-offering — bounds the "force-quit during recovery_confirm
  //   itself" case at exactly one prompt per marker. Acknowledges
  //   the user-spec phrasing "marker stays for next mount, but no
  //   recursive recovery flow" by making the marker durable while
  //   the recovery decision is single-shot.
  recoveryOfferedAt: number | null;
}

export async function writeMarker(marker: FlowSessionMarker): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marker));
  } catch (error) {
    logger.warn('flowSessionMarker: writeMarker failed', error);
  }
}

export async function readMarker(): Promise<FlowSessionMarker | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    logger.warn('flowSessionMarker: readMarker failed', error);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidMarker(parsed)) {
      logger.warn(
        'flowSessionMarker: readMarker found malformed marker, ignoring'
      );
      return null;
    }
    return parsed;
  } catch (error) {
    logger.warn('flowSessionMarker: readMarker JSON parse failed', error);
    return null;
  }
}

export async function clearMarker(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.warn('flowSessionMarker: clearMarker failed', error);
  }
}

// Pure: was the marker captured too long ago to recover from?
// Anchored to sessionEndedAt (when the player completed) rather than
// sessionStartedAt — the relevant clock for "is the stateBefore still
// meaningful as a comparison" is when the protocol ENDED.
export function isExpired(
  marker: FlowSessionMarker,
  nowMs: number
): boolean {
  return nowMs - marker.sessionEndedAt > MAX_AGE_MS;
}

/**
 * Read the marker and apply the recovery-offer policy:
 *
 *   - No marker → returns null (normal flow).
 *   - Marker outside 30-min timeout → silently clear, return null.
 *   - Marker already offered (recoveryOfferedAt set) → silently
 *     clear, return null. One-shot guard against the "force-quit
 *     during recovery_confirm UI" loop.
 *   - Marker eligible → write back with recoveryOfferedAt set, return
 *     the marker so the caller can construct the recovery FlowInit.
 *
 * Side-effecting (writes/clears AsyncStorage). Pure helpers
 * (readMarker, clearMarker, writeMarker, isExpired) are independently
 * testable.
 */
export async function readMarkerForRecoveryOffer(
  nowMs: number
): Promise<FlowSessionMarker | null> {
  const marker = await readMarker();
  if (marker === null) return null;

  if (isExpired(marker, nowMs)) {
    await clearMarker();
    return null;
  }

  if (marker.recoveryOfferedAt !== null) {
    // One-shot guard.
    await clearMarker();
    return null;
  }

  // Mark as offered before returning. Subsequent mounts will see the
  // recoveryOfferedAt and silent-clear instead of looping.
  const offered: FlowSessionMarker = {
    ...marker,
    recoveryOfferedAt: nowMs,
  };
  await writeMarker(offered);
  return offered;
}

// Test-only exports — not for production code.
export const _FLOW_SESSION_MARKER_STORAGE_KEY = STORAGE_KEY;
export const _FLOW_SESSION_MARKER_MAX_AGE_MS = MAX_AGE_MS;

// ----- internal validation -----

function isValidMarker(x: unknown): x is FlowSessionMarker {
  if (x === null || typeof x !== 'object') return false;
  const o = x as Partial<FlowSessionMarker>;
  return (
    typeof o.protocolId === 'string' &&
    typeof o.stateBefore === 'string' &&
    typeof o.timeWindowSelected === 'number' &&
    typeof o.sessionStartedAt === 'number' &&
    typeof o.sessionEndedAt === 'number' &&
    typeof o.durationActualSeconds === 'number' &&
    typeof o.intentPath === 'string' &&
    typeof o.entrySource === 'string' &&
    (o.recoveryOfferedAt === null || typeof o.recoveryOfferedAt === 'number')
  );
}
