/**
 * Stress-recovery onboarding (Model A) — static config.
 *
 * Holds the step-route order (resume), the skippable personalization options
 * (stressors, peak window), and the protocol defaults used when personalization
 * was skipped or a route param was lost on resume (spec Edge Case 8).
 */
import type { BrainState } from '../types/models';

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

/** Screen 3 — "what's driving it" (skippable). Stress-framed, plain language. */
export const STRESSOR_OPTIONS: { id: string; label: string }[] = [
  { id: 'racing_mind', label: 'A racing mind' },
  { id: 'cant_switch_off', label: "Can't switch off after work" },
  { id: 'foggy_scattered', label: 'Foggy and scattered' },
  { id: 'cant_wind_down', label: "Can't wind down for sleep" },
  { id: 'feeling_reactive', label: 'Feeling reactive' },
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

/**
 * Onboarding-only entry-protocol overrides. The signup-moment demo must be
 * completable phone-only, anywhere, in a few minutes — so Wired is routed to
 * breathwork (cyclic sighing / physiological sigh) instead of the generic
 * selector's pick of Cold Water Reset, which requires cold running water.
 *
 * Scope is the onboarding moment ONLY: the catalog and production
 * `selectProtocol` are untouched, so Cold Water Reset stays available to Wired
 * users in the post-onboarding library. Non-overridden states fall through to
 * `selectProtocol`.
 */
export const ONBOARDING_ENTRY_PROTOCOL_OVERRIDES: Partial<Record<BrainState, string>> = {
  wired: 'cyclic-sighing-2',
};
