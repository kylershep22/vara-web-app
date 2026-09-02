/**
 * Protocol selection (spec 6.2, time-aware per roadmap 3b-ii-a).
 *
 * A cell is an ordered array of time variants, so selection is a filter with a
 * documented fallback rather than the single lookup it used to be.
 *
 * TOTALITY IS A RULE HERE, NOT A PROPERTY OF THE TYPE. The old matrix held one
 * protocol per cell and could not miss; an array can lack the class the caller
 * asks for. `selectProtocol` is still total for every (phase, capacity, time),
 * but only because of the ladder below, and `__tests__/selectProtocol.test.ts`
 * is what holds it to that. Do not add a return path that can be undefined.
 */
import { PROTOCOL_MATRIX, TIME_CLASSES } from './protocolMatrix';
import type { CapacityTier, OutcomeKey, TimeClass, ProtocolVariant } from './types';
import type { DestinationKey, PhaseKey } from '../types/models';

/**
 * LEGACY BRIDGE - dies with JOURNEY_IA flag retirement.
 *
 * The one remaining path that still holds an `OutcomeKey` rather than a phase:
 * the flag-off Today path, `WeeklyOpenScreen`, and the onboarding terminal.
 * Each of those retires on its own schedule (3b, 3b, slice 4), and this
 * function retires with the last of them.
 *
 * THE MAPPING IS LOSSY AND THAT IS FINE HERE. Three outcomes collapse onto
 * `recover` because their content did (roadmap 3.2), so nothing is invented:
 * the variant a legacy caller gets is the same row it always got, now read out
 * of the cell that row moved into.
 *
 * It is NOT the inverse of anything. `destinationForOutcome` in
 * `journey/resolveJourney.ts` maps the same union to DestinationKey and is a
 * bijection; this one is not, and the two must not be confused for a pair.
 */
export function legacyPhaseFor(outcome: OutcomeKey): PhaseKey {
  return outcome === 'focus' ? 'refocus' : 'recover';
}

/**
 * Order a cell's variants for a destination. NEVER filters (roadmap 3.2).
 *
 * Stable sort, descending by `destinationWeight?.[destination]`. A variant with
 * no weight for this destination sorts as 0, so an unweighted cell comes back
 * in authored order untouched.
 *
 * CURRENTLY THE IDENTITY ON EVERY CELL, because no variant carries weights yet.
 * That is the honest state of it: the function is real, it is tested against
 * hand-built weighted cells, and it does nothing to the shipped matrix until
 * Jen defines the weights. It exists now so that when they land, the change is
 * data.
 *
 * WHY ORDER AND NOT MEMBERSHIP. A filter can empty a cell, and an empty cell
 * has no protocol to serve; ordering cannot fail. Every variant in a phase is
 * servable to every destination, and the destination only decides which leads.
 */
export function orderForDestination(
  variants: ProtocolVariant[],
  destination: DestinationKey
): ProtocolVariant[] {
  // `map` to index then sort, rather than sorting in place: Array.sort is only
  // guaranteed stable in modern engines, and the index tiebreak makes the
  // stability a property of this code rather than of the runtime.
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => {
      const wa = a.variant.destinationWeight?.[destination] ?? 0;
      const wb = b.variant.destinationWeight?.[destination] ?? 0;
      return wb - wa || a.index - b.index;
    })
    .map((entry) => entry.variant);
}

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

/**
 * The day's protocol for a phase, a readiness tier, a time window and a
 * destination.
 *
 * ORDER OF OPERATIONS MATTERS. The destination orders the cell FIRST, then the
 * time ladder picks from it. Reversing them would let the time filter choose a
 * variant before the destination had a say, which is only invisible while every
 * cell holds one variant per class - and `recover` no longer does.
 */
export function selectProtocol(
  phase: PhaseKey,
  capacity: CapacityTier,
  time: TimeClass,
  destination: DestinationKey
): ProtocolVariant {
  const ordered = orderForDestination(PROTOCOL_MATRIX[phase][capacity], destination);
  return pickVariant(ordered, time);
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
  phase: PhaseKey,
  capacity: CapacityTier
): ProtocolVariant {
  return PROTOCOL_MATRIX[phase][capacity][0];
}
