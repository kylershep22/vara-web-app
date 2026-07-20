/**
 * Guardrail: the onboarding first win MUST be completable phone-only, anywhere,
 * for EVERY quadrant a new user could land on. The signup-moment demo has no
 * guaranteed sink, window, or room to walk, so an equipment/location practice
 * served here is a silent, credibility-breaking failure.
 *
 * Two layers:
 *  1. The catalog filter itself removes the equipment/location families.
 *  2. resolve(), fed that filtered catalog at the onboarding budget, never
 *     surfaces an equipment practice for any of the four quadrants — including
 *     the Depleted nsdr->settle DEGRADATION path, where cold-water-reset is
 *     eligible and today avoids selection only by an alphabetical tiebreak.
 */
import { resolve } from '../../../engine';
import type { Arousal, Valence, Quadrant } from '../../../engine/types';
import { getAllProtocols } from '../../../constants/brainStateProtocols';
import { ONBOARDING_PROTOCOL_TIME_WINDOW } from '../../../constants/onboardingStressRecovery';
import {
  onboardingPhoneOnlyCatalog,
  isPhoneOnlyPractice,
} from '../onboardingCatalog';
import type { Protocol, ProtocolFamily, ProtocolModality } from '../../../types/models';

// The concrete equipment/location signals in the catalog, derived independently
// of the filter under test so this asserts the real-world property, not the
// filter's own definition: cold-water-reset needs a sink, bright-light needs a
// window, mindful-walking needs a safe place to walk.
const EQUIPMENT_FAMILIES: ProtocolFamily[] = [
  'cold-water-reset',
  'mindful-walking',
  'bright-light',
];
const EQUIPMENT_MODALITIES: ProtocolModality[] = ['cold', 'environmental'];

function requiresEquipment(p: Protocol): boolean {
  return (
    EQUIPMENT_FAMILIES.includes(p.family) ||
    EQUIPMENT_MODALITIES.includes(p.modality)
  );
}

// The four quadrants a new user can land on, keyed by the two-tap read that
// produces each (classifyQuadrant: revved+hard=Tense, revved+good=Activated,
// low+hard=Depleted, low+good=Calm).
const QUADRANT_INPUTS: Record<Quadrant, { arousal: Arousal; valence: Valence }> = {
  Tense: { arousal: 'revved', valence: 'hard' },
  Activated: { arousal: 'revved', valence: 'good' },
  Depleted: { arousal: 'low', valence: 'hard' },
  Calm: { arousal: 'low', valence: 'good' },
};

describe('onboardingPhoneOnlyCatalog', () => {
  it('removes every equipment/location family (sink, window, walk space)', () => {
    // Guard: the source catalog really does contain equipment practices, so a
    // filter that removes them is doing meaningful work (not vacuously passing).
    const full = getAllProtocols();
    expect(full.some(requiresEquipment)).toBe(true);

    const filtered = onboardingPhoneOnlyCatalog();
    expect(filtered.some(requiresEquipment)).toBe(false);
    expect(filtered.find((p) => p.family === 'cold-water-reset')).toBeUndefined();
    expect(filtered.find((p) => p.family === 'bright-light')).toBeUndefined();
    expect(filtered.find((p) => p.family === 'mindful-walking')).toBeUndefined();
  });

  it('keeps the phone-only breath/sensory practices onboarding relies on', () => {
    const filtered = onboardingPhoneOnlyCatalog();
    expect(filtered.find((p) => p.id === 'box-breathing-2')).toBeDefined();
    expect(filtered.find((p) => p.id === 'cyclic-sighing-2')).toBeDefined();
    expect(filtered.find((p) => p.id === 'sensory-reset-2')).toBeDefined();
  });

  it('isPhoneOnlyPractice flags equipment practices false and phone practices true', () => {
    const coldWater = getAllProtocols().find((p) => p.family === 'cold-water-reset');
    const boxBreathing = getAllProtocols().find((p) => p.id === 'box-breathing-2');
    expect(coldWater).toBeDefined();
    expect(boxBreathing).toBeDefined();
    expect(isPhoneOnlyPractice(coldWater!)).toBe(false);
    expect(isPhoneOnlyPractice(boxBreathing!)).toBe(true);
  });
});

describe('onboarding first win is phone-only for every quadrant', () => {
  const catalog = onboardingPhoneOnlyCatalog();

  (Object.keys(QUADRANT_INPUTS) as Quadrant[]).forEach((quadrant) => {
    it(`${quadrant}: every resolved practice needs no equipment`, () => {
      const plan = resolve({
        situation: 'just_reset',
        state: QUADRANT_INPUTS[quadrant],
        clockTime: { hour: 13 }, // midday, non-evening
        timeBudget: ONBOARDING_PROTOCOL_TIME_WINDOW,
        catalog,
      });

      const practices = plan.slots
        .filter((s) => s.kind === 'practice')
        .map((s) => (s as { practice: Protocol }).practice);

      // Onboarding must always deliver a felt first win.
      expect(practices.length).toBeGreaterThan(0);
      practices.forEach((p) => {
        expect(requiresEquipment(p)).toBe(false);
      });
    });
  });

  // Pins the actual lead practice per quadrant. Doubles as the first-win-quality
  // guard: if a catalog/ranker change swaps the onboarding first win, this fails
  // loudly so we re-review quality before it ships.
  it('resolves the expected phone-only lead practice per quadrant', () => {
    const leadByQuadrant = (Object.keys(QUADRANT_INPUTS) as Quadrant[]).reduce(
      (acc, quadrant) => {
        const plan = resolve({
          situation: 'just_reset',
          state: QUADRANT_INPUTS[quadrant],
          clockTime: { hour: 13 },
          timeBudget: ONBOARDING_PROTOCOL_TIME_WINDOW,
          catalog,
        });
        const lead = plan.slots.find((s) => s.kind === 'practice') as
          | { practice: Protocol }
          | undefined;
        acc[quadrant] = lead?.practice.id ?? null;
        return acc;
      },
      {} as Record<Quadrant, string | null>
    );

    // PROVISIONAL — these leads come from the placeholder PRACTICE_LEAD_PREFERENCE
    // seed (src/engine/practicePreference.ts), NOT a clinical decision. The seed
    // ranks extended-exhale-2 ahead of box-breathing-2, so the three settle-led
    // quadrants now surface Extended Exhale as the onboarding first win. If you
    // are here because this gate tripped again: it guards a placeholder pending
    // clinical review, so confirm the swap is intended before re-pinning.
    expect(leadByQuadrant).toEqual({
      Tense: 'extended-exhale-2',
      Activated: 'sensory-reset-2',
      Depleted: 'extended-exhale-2',
      Calm: 'extended-exhale-2',
    });
  });
});
