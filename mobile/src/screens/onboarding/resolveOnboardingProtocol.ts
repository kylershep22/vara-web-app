/**
 * Shared onboarding protocol resolution. The Reflect screen (to name the
 * protocol's duration) and the Protocol screen (to actually play it) MUST agree
 * on which protocol a brain state maps to — otherwise the reflect copy promises
 * a duration the user doesn't get. Both import this single resolver.
 *
 * Resolution (circumplex rehost): the onboarding first win now comes from the
 * SHIPPED engine, same as the dashboard. We reverse-bridge the (bridged) five-
 * state route value back to its two-tap circumplex reading, pin the neutral
 * `just_reset` situation, and let resolve() pick the lead practice over a
 * phone-only catalog. The reverse-bridge is lossless for the four quadrants the
 * two-tap read produces (wired/alive/foggy/steady ↔ Tense/Activated/Depleted/
 * Calm). The retired override hardcode is replaced by the catalog constraint —
 * see onboardingCatalog.ts. Selection is clock-independent for `just_reset`
 * (no §8 evening modifier, and the default ranker ignores the clock), so Reflect
 * and Protocol resolve the same practice regardless of when each screen renders.
 */
import type { BrainState, Protocol } from '../../types/models';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { resolve } from '../../engine';
import { brainStateToCircumplex } from '../../engine/stateBridge';
import {
  ONBOARDING_PROTOCOL_TIME_WINDOW,
  DEFAULT_ONBOARDING_PROTOCOL_ID,
  driverValenceForState,
} from '../../constants/onboardingStressRecovery';
import { onboardingPhoneOnlyCatalog, ONBOARDING_SITUATION } from './onboardingCatalog';

export function resolveOnboardingProtocol(state: BrainState): Protocol | null {
  const plan = resolve({
    situation: ONBOARDING_SITUATION,
    state: brainStateToCircumplex(state),
    clockTime: { hour: new Date().getHours() },
    timeBudget: ONBOARDING_PROTOCOL_TIME_WINDOW,
    catalog: onboardingPhoneOnlyCatalog(),
  });
  const lead = plan.slots.find((s) => s.kind === 'practice');
  if (lead && lead.kind === 'practice') return lead.practice;
  // just_reset always yields a practice, but never dead-end the demo: fall back
  // to the library-invariant downshift protocol if a slot ever fails to fill.
  return getProtocolById(DEFAULT_ONBOARDING_PROTOCOL_ID) ?? null;
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

/**
 * The calm "what to expect" line under the Reflect lead-in. Generic across
 * protocols (no valence branch) and sized to the SAME duration source the
 * lead-in uses. Returns null when the duration can't be resolved (state lost),
 * so the screen simply omits the line rather than render a broken "{n}".
 */
export function onboardingWhatToExpectLine(state: BrainState | null): string | null {
  const protocol = state ? resolveOnboardingProtocol(state) : null;
  const seconds = protocol?.durationSeconds;
  if (!seconds || seconds <= 0) return null;
  return `It's about ${minutesWord(seconds)} minutes, fully guided, so there's nothing to figure out. Just follow along.`;
}
