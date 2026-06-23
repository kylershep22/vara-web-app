// AsyncStorage marker for in-progress protocol sessions.
//
// The GuidedSessionPlayer writes a marker on session start and refreshes
// it periodically while the session runs. On clean exit (natural
// completion or End early) the player clears the marker. If the user
// force-quits the app mid-session — or the OS terminates it — the
// marker survives. On the next mount the player reads the marker,
// constructs a `force_quit` ProtocolSessionSummary from its data, fires
// `onRecoveredSession`, and clears the marker before starting the new
// session.
//
// Module is deliberately storage-only:
//   - Doesn't import the protocol library (utils → constants direction
//     stays one-way; a marker referencing a retired protocolId still
//     produces a valid summary, Phase 2 decides what to log).
//   - All async methods swallow AsyncStorage errors with a warning —
//     marker tracking is opportunistic, never fatal to the session.
//
// `buildRecoveredSummary` is pure and unit-tested in isolation.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  BrainState,
  ProtocolSessionSummary,
} from '../types/models';
import { logger } from './logger';

// Single marker key. Only one in-progress session per user at a time.
// (Phase 1 doesn't multi-track.)
const STORAGE_KEY = '@vara/protocolSessionInProgress';

// Markers older than this are treated as expired and silently
// discarded rather than recovered. 24 hours covers a forgotten
// foreground session, a same-day reinstall, etc., without recovering
// markers from previous app installs that still happen to be in the
// AsyncStorage cache.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SessionMarker {
  protocolId: string;
  // null for browse-launched sessions — no pre-protocol state was captured.
  // The recovery path carries it through to a force_quit summary unchanged.
  stateBefore: BrainState | null;
  startedAt: number;
  // Refreshed by the player every ~10s while the session is running.
  // Used as the `endedAt` for a recovered force_quit summary — it's
  // the last point we know the session was alive.
  lastUpdatedAt: number;
  currentStepIndex: number;
  stepsCompleted: number;
  // Stored on the marker so the recovery path doesn't need to
  // resolve the protocolId against the live library (and still works
  // if the protocol has since been retired).
  totalSteps: number;
}

export async function writeMarker(marker: SessionMarker): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marker));
  } catch (error) {
    logger.warn('sessionMarker: writeMarker failed', error);
  }
}

export async function readMarker(): Promise<SessionMarker | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    logger.warn('sessionMarker: readMarker failed', error);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidMarker(parsed)) {
      logger.warn(
        'sessionMarker: readMarker found malformed marker, ignoring'
      );
      return null;
    }
    return parsed;
  } catch (error) {
    logger.warn('sessionMarker: readMarker JSON parse failed', error);
    return null;
  }
}

export async function clearMarker(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.warn('sessionMarker: clearMarker failed', error);
  }
}

// Returns true if the marker is too old to recover from. Pure for
// testability; player computes nowMs and passes it.
export function isExpired(marker: SessionMarker, nowMs: number): boolean {
  return nowMs - marker.startedAt > MAX_AGE_MS;
}

// Build a force_quit summary from a recovered marker. Pure; no
// AsyncStorage access. Player calls this on mount when readMarker
// returns a non-null, non-expired marker.
export function buildRecoveredSummary(
  marker: SessionMarker
): ProtocolSessionSummary {
  const durationMs = Math.max(
    0,
    marker.lastUpdatedAt - marker.startedAt
  );
  return {
    protocolId: marker.protocolId,
    stateBefore: marker.stateBefore,
    completed: false,
    durationActualSeconds: Math.floor(durationMs / 1000),
    stepsCompleted: marker.stepsCompleted,
    totalSteps: marker.totalSteps,
    abandonReason: 'force_quit',
    startedAt: marker.startedAt,
    endedAt: marker.lastUpdatedAt,
  };
}

// Test-only: exposed for the dev test screen and recovery integration
// tests in sub-step 4.4. Not for production code.
export const _SESSION_MARKER_STORAGE_KEY = STORAGE_KEY;
export const _SESSION_MARKER_MAX_AGE_MS = MAX_AGE_MS;

// ----- internal validation -----

function isValidMarker(x: unknown): x is SessionMarker {
  if (x === null || typeof x !== 'object') return false;
  const o = x as Partial<SessionMarker>;
  return (
    typeof o.protocolId === 'string' &&
    // null is valid (browse-launched marker); a string is a captured state.
    (o.stateBefore === null || typeof o.stateBefore === 'string') &&
    typeof o.startedAt === 'number' &&
    typeof o.lastUpdatedAt === 'number' &&
    typeof o.currentStepIndex === 'number' &&
    typeof o.stepsCompleted === 'number' &&
    typeof o.totalSteps === 'number'
  );
}
