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
import type { Quadrant } from '../../engine/types';
import { classifyQuadrant } from '../../engine';
import { brainStateToCircumplex } from '../../engine/stateBridge';
import { quadrantToBrainState } from '../../engine/stateBridge';
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

// ── Circumplex re-check display (Vara_Engine_Contract.md §2) ─────────────────
// The re-check speaks the two-tap circumplex vocabulary. These felt words are
// the user-facing quadrant names for the shift line + transition row. The
// lowercase FRAGMENT reads mid-sentence ("You went from wound up to settled");
// the FELT_LABEL is the title-case chip on the transition row. Colors reuse the
// existing swatches via the state bridge, so the re-check dots match the read
// above them and the Tense dot stays the non-error terracotta (scope: colors).

const QUADRANT_FRAGMENT: Record<Quadrant, string> = {
  Tense: 'wound up',
  Depleted: 'running low',
  Activated: 'charged up',
  Calm: 'settled',
};

export const QUADRANT_FELT_LABEL: Record<Quadrant, string> = {
  Tense: 'Wound up',
  Depleted: 'Running low',
  Activated: 'Charged up',
  Calm: 'Settled',
};

export const QUADRANT_COLOR: Record<Quadrant, string> = {
  Tense: STATE_COLORS[quadrantToBrainState('Tense')],
  Depleted: STATE_COLORS[quadrantToBrainState('Depleted')],
  Activated: STATE_COLORS[quadrantToBrainState('Activated')],
  Calm: STATE_COLORS[quadrantToBrainState('Calm')],
};

/** The quadrant a (bridged) five-state value reads back to. Lossless for the
 * four quadrants the two-tap read produces; `clear` resolves to Calm. */
export function quadrantForBrainState(state: BrainState): Quadrant {
  const c = brainStateToCircumplex(state);
  return classifyQuadrant(c.arousal, c.valence);
}

const QUADRANT_VALENCE: Record<Quadrant, 'good' | 'hard'> = {
  Tense: 'hard',
  Depleted: 'hard',
  Activated: 'good',
  Calm: 'good',
};

/**
 * Re-check transition bucket in circumplex terms. The onboarding practice is
 * always a settle practice, so reaching Calm is the felt win; anything else is
 * framed honestly, never as an overclaimed win and never as a failure.
 *
 *   eased         — re-checked into Calm from elsewhere (the win + the arrow row).
 *   held_calm     — already Calm, stayed Calm (affirm staying with it).
 *   charge_remains— came from a hard state, still revved (Activated): honest,
 *                   "some charge left, a little more can help it settle".
 *   held_good     — was already good (Calm/Activated), still good high-energy.
 *   quiet         — both hard states (no shift): compassionate, non-shaming.
 *   dipped        — was good, re-checked into a hard state: names the catch.
 */
export type QuadrantShiftBucket =
  | 'eased'
  | 'held_calm'
  | 'charge_remains'
  | 'held_good'
  | 'quiet'
  | 'dipped';

export function classifyQuadrantShift(before: Quadrant, after: Quadrant): QuadrantShiftBucket {
  if (after === 'Calm') return before === 'Calm' ? 'held_calm' : 'eased';
  const beforeGood = QUADRANT_VALENCE[before] === 'good';
  // after is not Calm here, so afterGood ⇒ Activated (revved + good).
  if (QUADRANT_VALENCE[after] === 'good') return beforeGood ? 'held_good' : 'charge_remains';
  // after is a hard state (Tense/Depleted).
  return beforeGood ? 'dipped' : 'quiet';
}

/**
 * The "You went from X to settled" felt-win line, sized to the ACTUAL elapsed
 * time so an early exit can't claim the nominal length. Under two minutes (and
 * null/0) drops the duration claim ("just now") — we only ship plural-minute
 * copy. Pure formatter; only meaningful for the `eased` bucket.
 */
export function easedShiftLine(before: Quadrant, durationSeconds: number | null): string {
  const movement = `You went from ${QUADRANT_FRAGMENT[before]} to settled`;
  const minutes = durationSeconds ? Math.round(durationSeconds / 60) : 0;
  if (!durationSeconds || durationSeconds <= 0 || minutes < 2) {
    return `${movement} just now.`;
  }
  return `${movement} in ${minutesWord(durationSeconds)} minutes.`;
}

/**
 * Screen 7 — the before->after shift line in circumplex terms, branched by the
 * quadrant transition. `durationActualSeconds` is the real elapsed time from the
 * player (null/short → "just now"). Outcome derivation (computeShift/shiftOutcome)
 * is separate and still keyed off the bridged five-state values.
 */
export function quadrantShiftLine(
  before: Quadrant,
  after: Quadrant,
  durationActualSeconds: number | null
): string {
  switch (classifyQuadrantShift(before, after)) {
    case 'eased':
      return easedShiftLine(before, durationActualSeconds);
    case 'charge_remains':
      return "Still some charge there, and that's okay. A couple more minutes can help it settle.";
    case 'held_calm':
      return "You're settled, and staying with it is the whole practice.";
    case 'held_good':
      return "You're in a good place. Showing up when you already feel good matters just as much as when things are hard.";
    case 'quiet':
      return "Recovery isn't linear. Some days the shift is quiet. Showing up is the part that compounds.";
    case 'dipped':
      return "States move through the day, and noticing the shift is its own kind of skill. You're in a tougher spot than when you started, and that's exactly what these check-ins help you catch.";
  }
}
