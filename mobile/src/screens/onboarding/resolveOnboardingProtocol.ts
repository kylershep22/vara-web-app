/**
 * Shared onboarding protocol resolution. The Reflect screen (to name the
 * protocol's duration) and the Protocol screen (to actually play it) MUST agree
 * on which protocol a brain state maps to — otherwise the reflect copy promises
 * a duration the user doesn't get. Both import this single resolver.
 *
 * Resolution (per commit 3b0a5f5): an onboarding-only override routes some
 * states to a phone-only protocol for the signup demo (Wired -> Cyclic Sighing
 * instead of Cold Water Reset, which needs running water); other states fall
 * through the generic selector. The catalog / selectProtocol are untouched.
 */
import type { BrainState, Protocol } from '../../types/models';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { selectProtocol } from '../../services/protocolSelector.service';
import {
  ONBOARDING_ENTRY_PROTOCOL_OVERRIDES,
  ONBOARDING_PROTOCOL_TIME_WINDOW,
  DEFAULT_ONBOARDING_PROTOCOL_ID,
  driverValenceForState,
} from '../../constants/onboardingStressRecovery';

export function resolveOnboardingProtocol(state: BrainState): Protocol | null {
  const overrideId = ONBOARDING_ENTRY_PROTOCOL_OVERRIDES[state];
  if (overrideId) {
    const overridden = getProtocolById(overrideId);
    if (overridden) return overridden;
  }
  try {
    return selectProtocol({ state, timeWindow: ONBOARDING_PROTOCOL_TIME_WINDOW });
  } catch {
    // selectProtocol throws in __DEV__ on a no-match; fall back to the library
    // invariant protocol so onboarding never dead-ends.
    return getProtocolById(DEFAULT_ONBOARDING_PROTOCOL_ID) ?? null;
  }
}

// Small-number words keep the reset copy in brand voice ("two-minute", not
// "2-minute"); numerals are a fallback for anything beyond the spelled range
// (onboarding entry protocols only ever reach 2 or 5 minutes today).
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

export function minutesWord(durationSeconds: number): string {
  const minutes = Math.round(durationSeconds / 60);
  return minutes >= 1 && minutes <= 10 ? NUMBER_WORDS[minutes] : String(minutes);
}

/**
 * The "Here's a {duration} …" lead-in on the Reflect screen, sized to the
 * actually-selected protocol and branched by state valence (shared helper):
 *   - Activated (Wired, Foggy) / default: "...reset to help your system downshift."
 *   - Positive (Steady, Clear, Alive):    "...practice to help you stay with this."
 * Falls back to a generic phrase (same valence split) when the state or the
 * protocol's duration can't be resolved (rather than rendering a wrong or
 * "{undefined}-minute" string).
 */
export function onboardingResetLine(state: BrainState | null): string {
  const protocol = state ? resolveOnboardingProtocol(state) : null;
  const seconds = protocol?.durationSeconds;
  const positive = driverValenceForState(state) === 'positive';
  if (!seconds || seconds <= 0) {
    return positive
      ? "Here's a short practice to help you stay with this."
      : "Here's a short reset to help your system downshift.";
  }
  return positive
    ? `Here's a ${minutesWord(seconds)}-minute practice to help you stay with this.`
    : `Here's a ${minutesWord(seconds)}-minute reset to help your system downshift.`;
}
