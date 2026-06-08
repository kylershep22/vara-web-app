/**
 * Pure copy/logic for the re-check shift (screen 7). No React/RN imports, so
 * it's unit-testable without loading the screen's dependency tree. Screens
 * import these helpers.
 *
 * Valence coherence: the shift LINE branches on the before->after valence
 * transition (classifyShiftBucket); BRAIN_LINE branches on the INITIAL state's
 * valence via driverValenceForState (the single valence source shared with the
 * Reflect lead-in and the driver screen). No new valence maps.
 */
import type { BrainState, ProtocolSessionOutcome } from '../../types/models';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { driverValenceForState } from '../../constants/onboardingStressRecovery';
import { minutesWord } from './resolveOnboardingProtocol';

export const STATE_LABELS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.label }),
  {} as Record<BrainState, string>
);

// Same per-state colors the selection cards use (BrainStateOptionRow dot), so
// the re-check transition visual matches the swatches above it.
export const STATE_COLORS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.color }),
  {} as Record<BrainState, string>
);

/**
 * The "your brain is learning" reassurance under the shift line (screen 7),
 * branched on the INITIAL state's valence. Activated arrivals get the
 * stress-recovery framing; positive arrivals get a resilience framing that
 * doesn't presume they needed to recover.
 */
export const BRAIN_LINE_ACTIVATED =
  'Small recovery moments like this, repeated, are how your brain learns to handle stress better over time.';

export const BRAIN_LINE_POSITIVE =
  'Small moments like this, repeated, are how your brain builds resilience over time.';

export function brainLine(initialState: BrainState): string {
  return driverValenceForState(initialState) === 'positive'
    ? BRAIN_LINE_POSITIVE
    : BRAIN_LINE_ACTIVATED;
}

export type Shift = 'improved' | 'flat' | 'worse';

// Ordinal toward regulation. Drives the legacy improved/flat/worse outcome
// (shiftOutcome → protocolSession.outcome, unchanged) and the within-valence
// direction check in classifyShiftBucket. Never used to gate.
const RANK: Record<BrainState, number> = { wired: 0, foggy: 1, steady: 2, clear: 3, alive: 4 };

export function computeShift(before: BrainState, after: BrainState): Shift {
  if (RANK[after] > RANK[before]) return 'improved';
  if (RANK[after] < RANK[before]) return 'worse';
  return 'flat';
}

export function shiftOutcome(shift: Shift): ProtocolSessionOutcome {
  if (shift === 'improved') return 'shifted';
  if (shift === 'flat') return 'maintenance';
  return 'not_shifted';
}

/**
 * Valence-transition bucket for the re-check shift line. Single valence source
 * (driverValenceForState); positive = steady/clear/alive, activated = wired/foggy.
 *
 *   moved         — re-checked UP into a positive state (the only bucket that
 *                   earns the "you moved" line + the before->after arrow row).
 *                   Covers activated->positive and upward positive->positive.
 *   activated     — both states activated (flat, or a lateral wired<->foggy move).
 *   positive_hold — both states positive but not an upward move (flat or a dip
 *                   that stays inside the good range).
 *   positive_dip  — started positive, re-checked into an activated state.
 */
export type ShiftBucket = 'moved' | 'activated' | 'positive_hold' | 'positive_dip';

export function classifyShiftBucket(before: BrainState, after: BrainState): ShiftBucket {
  const beforePositive = driverValenceForState(before) === 'positive';
  const afterPositive = driverValenceForState(after) === 'positive';
  if (afterPositive && RANK[after] > RANK[before]) return 'moved';
  if (!beforePositive && !afterPositive) return 'activated';
  if (beforePositive && afterPositive) return 'positive_hold';
  return 'positive_dip';
}

/**
 * "You moved …" line, sized to the ACTUAL elapsed time so an early exit can't
 * falsely claim the protocol's nominal length. Durations that round to under
 * two minutes (and null/0) drop the duration claim entirely — "just now" —
 * because we only ship plural-minute copy ("two/five minutes"); this also
 * avoids an ungrammatical "one minutes" / "zero minutes". Pure formatter.
 */
export function improvedShiftLine(
  before: BrainState,
  after: BrainState,
  durationSeconds: number | null
): string {
  const movement = `You moved from ${STATE_LABELS[before]} to ${STATE_LABELS[after]}`;
  const minutes = durationSeconds ? Math.round(durationSeconds / 60) : 0;
  if (!durationSeconds || durationSeconds <= 0 || minutes < 2) {
    return `${movement} just now.`;
  }
  return `${movement} in ${minutesWord(durationSeconds)} minutes.`;
}

/**
 * Screen 7 — the before->after shift line, branched by valence transition.
 * `durationActualSeconds` is the real elapsed time forwarded from the player
 * (null/short → "just now"). Outcome derivation (computeShift/shiftOutcome) is
 * separate and unchanged.
 */
export function shiftLine(
  before: BrainState,
  after: BrainState,
  durationActualSeconds: number | null
): string {
  switch (classifyShiftBucket(before, after)) {
    case 'moved':
      return improvedShiftLine(before, after, durationActualSeconds);
    case 'activated':
      return "Recovery isn't linear. Some days the shift is quiet. Showing up is the part that compounds.";
    case 'positive_hold':
      return "You're in a good place. Showing up when you already feel good matters just as much as when things are hard.";
    case 'positive_dip':
      return "States move through the day, and noticing the shift is its own kind of skill. You're in a tougher spot than when you started, and that's exactly what these check-ins help you catch.";
  }
}
