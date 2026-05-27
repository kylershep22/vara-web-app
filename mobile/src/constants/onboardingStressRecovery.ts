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
