/**
 * Stress-recovery onboarding (Model A) — static config.
 *
 * Holds the step-route order (resume), the skippable personalization options
 * (stressors, peak window), and the protocol defaults used when personalization
 * was skipped or a route param was lost on resume (spec Edge Case 8).
 */
import type { BrainState } from '../types/models';
import type { Situation } from '../engine/types';

/**
 * Situation the onboarding read is pinned to. Onboarding is an opinionated
 * stress-recovery arc ("your system is running hot") — the user is here to
 * downshift, not to pick an outcome — so we skip the situation step and feed the
 * engine the neutral regulate-to-baseline situation. The two-tap state read
 * still personalizes the plan within it (quadrant). Canonical home is here so
 * both the screens and the onboarding services can share it without a
 * service→screen import; onboardingCatalog re-exports it.
 */
export const ONBOARDING_SITUATION: Situation = 'just_reset';

/** Ordered step routes for the stress-recovery onboarding arc (screens 1–9). */
export const ONBOARDING_SR_STEPS = [
  'OnboardingProblem',
  'OnboardingStateCheckIn',
  'OnboardingStressor',
  'OnboardingPeakWindow',
  'OnboardingReflect',
  'OnboardingProtocol',
  'OnboardingRecheck',
  'OnboardingBridge',
  'OnboardingAnchor',
] as const;

export type OnboardingSrStep = (typeof ONBOARDING_SR_STEPS)[number];

/**
 * Total steps in the arc, used as the denominator for the onboarding step
 * indicator. The protocol (Cold Water Reset) screen does not render the bar
 * but still occupies its true position, so positions intentionally skip it
 * (e.g. Reflect = 5, Recheck = 7).
 */
export const ONBOARDING_SR_TOTAL_STEPS = ONBOARDING_SR_STEPS.length;

/** 1-based position of a step within the arc, for the step indicator. */
export function onboardingStepNumber(step: OnboardingSrStep): number {
  return ONBOARDING_SR_STEPS.indexOf(step) + 1;
}

export type PeakWindow = 'morning' | 'midday' | 'evening';

/**
 * Screen 3 — driver selection (skippable, multi-select). The stem and option set
 * branch on the VALENCE of the brain state picked on screen 2:
 *   - Activated states (Wired, Foggy): "What's driving it?" — stress drivers.
 *   - Positive states (Steady, Clear, Alive): "What's behind it?" — supports.
 * Options are persisted as stable ids (onboardingStressRecovery.stressors:
 * string[]). Ids are unique across both sets, so the stored shape is unchanged.
 */
export interface DriverOption {
  id: string;
  label: string;
}

/** Activated valence (Wired, Foggy). The prior stress list, plus "stretched too thin"; "Foggy and scattered" removed. */
export const ACTIVATED_DRIVER_OPTIONS: DriverOption[] = [
  { id: 'racing_mind', label: 'A racing mind' },
  { id: 'cant_switch_off', label: "Can't switch off after work" },
  { id: 'stretched_too_thin', label: 'Stretched too thin' },
  { id: 'cant_wind_down', label: "Can't wind down for sleep" },
  { id: 'feeling_reactive', label: 'Feeling reactive' },
];

/** Positive valence (Steady, Clear, Alive). What's supporting the good state. */
export const POSITIVE_DRIVER_OPTIONS: DriverOption[] = [
  { id: 'good_nights_sleep', label: "A good night's sleep" },
  { id: 'movement_fresh_air', label: 'Some movement or fresh air' },
  { id: 'lighter_day', label: 'A lighter day than usual' },
  { id: 'connection', label: 'Connection with someone' },
  { id: 'slow_down', label: 'Time to slow down' },
  { id: 'not_sure', label: 'Not sure, it just feels this way' },
];

/** Brain states treated as positive valence for the driver question. */
const POSITIVE_DRIVER_STATES: readonly BrainState[] = ['steady', 'clear', 'alive'];

export type DriverValence = 'activated' | 'positive';

export function driverValenceForState(state: BrainState | null | undefined): DriverValence {
  return state && POSITIVE_DRIVER_STATES.includes(state) ? 'positive' : 'activated';
}

export interface DriverQuestion {
  stem: string;
  options: DriverOption[];
}

/**
 * Stem + option set for the driver screen, branched by state valence. Unknown or
 * missing state defaults to the activated set, matching DEFAULT_ONBOARDING_STATE
 * ('wired') and the prior always-stress behavior on a lost resume param.
 */
export function getDriverQuestion(state: BrainState | undefined): DriverQuestion {
  return driverValenceForState(state) === 'positive'
    ? { stem: "What's behind it?", options: POSITIVE_DRIVER_OPTIONS }
    : { stem: "What's driving it?", options: ACTIVATED_DRIVER_OPTIONS };
}

/**
 * Drivers retired from display but kept for id -> label resolution, so retained
 * accounts that persisted them before removal still render a label on the
 * Reflect snapshot. NEVER part of a selectable option set.
 */
const RETIRED_DRIVER_OPTIONS: DriverOption[] = [
  { id: 'foggy_scattered', label: 'Foggy and scattered' },
];

/**
 * Union of all driver options across valences, plus retired ids. Used ONLY for
 * id -> label resolution (e.g. the Reflect snapshot rebuilt from persisted ids
 * on resume), NEVER for display. Display uses the valence-specific lists via
 * getDriverQuestion. Kept under the legacy name so existing id->label callers
 * resolve every valence (and retired ids) without change.
 */
export const STRESSOR_OPTIONS: DriverOption[] = [
  ...ACTIVATED_DRIVER_OPTIONS,
  ...POSITIVE_DRIVER_OPTIONS,
  ...RETIRED_DRIVER_OPTIONS,
];

/** Screen 4 — "when it peaks" (skippable). Feeds the anchor suggestion. */
export const PEAK_WINDOW_OPTIONS: { id: PeakWindow; label: string; suggestedHour: number }[] = [
  { id: 'morning', label: 'Mornings', suggestedHour: 8 },
  { id: 'midday', label: 'Mid-day', suggestedHour: 13 },
  { id: 'evening', label: 'Evenings', suggestedHour: 20 },
];

/** Default anchor hour when no peak window was provided (evening). */
export const DEFAULT_ANCHOR_HOUR = 20;

/**
 * Fallbacks for the protocol step. State check-in (screen 2) is not skippable,
 * so a state is normally present; these cover the resume edge where a route
 * param was lost, and the "skipped everything" path (Edge Case 8). 'wired' is a
 * general downshift target; the protocol id is the hard fallback if
 * selectProtocol throws in __DEV__ on a no-match.
 */
export const DEFAULT_ONBOARDING_STATE: BrainState = 'wired';
export const DEFAULT_ONBOARDING_PROTOCOL_ID = 'cyclic-sighing-2';
export const ONBOARDING_PROTOCOL_TIME_WINDOW = 5; // minutes (ProtocolTimeWindow)

// The onboarding-only entry-protocol override (Wired -> Cyclic Sighing, to keep
// the signup demo phone-only) has been retired: the circumplex rehost resolves
// the first win through the engine over a phone-only catalog instead. See
// screens/onboarding/onboardingCatalog.ts.
