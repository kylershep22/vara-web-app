/**
 * Onboarding practice catalog — phone-only guardrail.
 *
 * The signup-moment first win must be completable phone-only, anywhere, in a
 * few minutes. A new user has no guaranteed sink, window, or room to walk, so
 * the engine's recommendation must never surface an equipment/location practice
 * during onboarding. This is the circumplex-native replacement for the retired
 * ONBOARDING_ENTRY_PROTOCOL_OVERRIDES hardcode: instead of pinning one practice,
 * we constrain the catalog resolve() draws from and let the engine pick within
 * it — no fork of the engine or the ranker.
 *
 * The exclusion keys off the two structured, redundant signals so a mis-tagged
 * practice is still caught by the other:
 *   - family:   cold-water-reset (sink), bright-light (window), mindful-walking
 *               (walk space)
 *   - modality: 'cold' (running water), 'environmental' (light/outdoors)
 *
 * Adding a new equipment/location family REQUIRES adding it here AND to the
 * every-quadrant assertion in onboardingCatalog.test.ts (the resolve() safety
 * net). The test guards the end-to-end property; this constant is one input.
 */
import { getAllProtocols } from '../../constants/brainStateProtocols';
import type { Protocol, ProtocolFamily, ProtocolModality } from '../../types/models';

const EQUIPMENT_FAMILIES: readonly ProtocolFamily[] = [
  'cold-water-reset',
  'mindful-walking',
  'bright-light',
];

const EQUIPMENT_MODALITIES: readonly ProtocolModality[] = ['cold', 'environmental'];

/** True when a practice needs no equipment or specific location (phone-only). */
export function isPhoneOnlyPractice(p: Protocol): boolean {
  return (
    !EQUIPMENT_FAMILIES.includes(p.family) &&
    !EQUIPMENT_MODALITIES.includes(p.modality)
  );
}

/** The full catalog minus equipment/location practices, for onboarding resolve(). */
export function onboardingPhoneOnlyCatalog(): Protocol[] {
  return getAllProtocols().filter(isPhoneOnlyPractice);
}
