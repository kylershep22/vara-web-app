/**
 * Protocol selection (spec 6.2, time-aware per roadmap 3b-ii-a).
 *
 * A cell is an ordered array of time variants, so selection is a filter with a
 * documented fallback rather than the single lookup it used to be.
 *
 * TOTALITY IS A RULE HERE, NOT A PROPERTY OF THE TYPE. The old matrix held one
 * protocol per cell and could not miss; an array can lack the class the caller
 * asks for. `selectProtocol` is still total for every (outcome, capacity, time),
 * but only because of the ladder below, and `__tests__/selectProtocol.test.ts`
 * is what holds it to that. Do not add a return path that can be undefined.
 */
import { PROTOCOL_MATRIX, TIME_CLASSES } from './protocolMatrix';
import type { CapacityTier, OutcomeKey, TimeClass, ProtocolVariant } from './types';

/**
 * THE FALLBACK LADDER, in order:
 *   1. a variant of the asked class          — the answer the user asked for
 *   2. else the nearest SHORTER class        — finishing early is acceptable
 *   3. else the cell's first (canonical)     — better than a blank card
 *
 * Step 2 walks DOWN rather than up on purpose. The time question asks what the
 * user has, so serving something longer spends time they said they did not have,
 * while serving something shorter simply leaves some back. Step 3 is the only
 * case that can overrun, and it is reached only when a cell has nothing at or
 * below the asked class at all.
 *
 * SEPARATED FROM THE MATRIX SO IT CAN BE TESTED. Every shipped cell holds one
 * variant today, which means selectProtocol returns that variant whether this
 * ladder works or not: a mutant deleting it passes every test driven off the
 * real matrix. Taking the cell as a parameter lets `__tests__/pickVariant.test.ts`
 * hand it the multi-variant cells the content pass has not written yet. Do not
 * inline this back into selectProtocol.
 *
 * Descends by CLASS, never by array position: a cell is not required to be
 * ordered, and "return the first one" is exactly the degradation this guards.
 *
 * `variants` must be non-empty; callers hold that (a matrix test pins it).
 */
export function pickVariant(
  variants: ProtocolVariant[],
  time: TimeClass
): ProtocolVariant {
  // Walk from the asked class downwards through shorter ones. Slicing to the
  // asked index and reversing gives exactly that order without restating it.
  const asked = TIME_CLASSES.indexOf(time);
  for (const candidate of TIME_CLASSES.slice(0, asked + 1).reverse()) {
    const match = variants.find((v) => v.timeClass === candidate);
    if (match) return match;
  }
  return variants[0];
}

/** The day's protocol for a readiness tier and a time window. */
export function selectProtocol(
  outcome: OutcomeKey,
  capacity: CapacityTier,
  time: TimeClass
): ProtocolVariant {
  return pickVariant(PROTOCOL_MATRIX[outcome][capacity], time);
}

/**
 * The cell's canonical variant, with no time answer involved.
 *
 * FOR WEEK-LEVEL CALLERS ONLY: the weekly open and the onboarding terminal
 * resolve a protocol BEFORE the user has answered any daily time question, and
 * they use it for a preview and for `WeeklyCycle.protocolId`. Passing a default
 * time class instead would let a fabricated daily answer decide what a WEEK
 * records, which is exactly the confusion the two axes were separated to end.
 *
 * This is also what makes `WeeklyCycle.protocolId` honest. It has described the
 * cell rather than the day since capacity went daily in 3b-i; naming the reader
 * `representativeProtocol` says so at the call site.
 *
 * Takes no `time` parameter, and must not gain one.
 */
export function representativeProtocol(
  outcome: OutcomeKey,
  capacity: CapacityTier
): ProtocolVariant {
  return PROTOCOL_MATRIX[outcome][capacity][0];
}
