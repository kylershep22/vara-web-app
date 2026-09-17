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
import { CAPACITY_TIERS, PROTOCOL_MATRIX, TIME_CLASSES } from './protocolMatrix';
import type {
  CapacityTier,
  OutcomeKey,
  RecoverMechanism,
  TimeClass,
  ProtocolVariant,
} from './types';
import type {
  AdjustChoiceId,
  DestinationKey,
  PhaseKey,
  RemoveFamily,
} from '../types/models';

/**
 * LEGACY BRIDGE - dies with JOURNEY_IA flag retirement.
 *
 * The one remaining path that still holds an `OutcomeKey` rather than a phase:
 * the flag-off Today path and the onboarding terminal.
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
 * LIVE ON RECOVER SINCE SLICE 7l, and the identity everywhere else. Jen's nine
 * weights (Content Pack v1 `§destination-weighting`) made this function decide
 * which of a Recover cell's three variants leads; `remove`, `refocus` and
 * `rewire` carry no weights, so it still returns those cells untouched.
 *
 * THE PARAGRAPH THAT STOOD HERE CLAIMED COVERAGE THAT DID NOT EXIST, and it is
 * replaced rather than amended because a reader had no way to tell. It read:
 * "the function is real, it is tested against hand-built weighted cells". There
 * were no such tests. The only assertion this function had was an identity
 * check over the SHIPPED cells, which passed precisely because every weight was
 * absent - so the sort had never once executed with a non-zero weight, and a
 * mutant replacing this body with `return variants` would have passed it.
 * `__tests__/orderForDestination.test.ts` is what makes the claim true, and
 * `__tests__/recoverServeTable.test.ts` pins what the ordering produces on the
 * real matrix. Both landed in 7l.
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
 * Order a Remove cell for a captured family. NEVER filters (slice 3c-i).
 *
 * THE LADDER, in order:
 *   1. variants whose family matches the capture
 *   2. then behavioral, the default family every Remove cell is guaranteed
 *   3. then everything else, in authored order
 *
 * WHY BEHAVIORAL IS THE FALLBACK RUNG rather than "whatever is first": every
 * Remove cell holds a behavioral variant by construction, so rung 2 can never
 * come up empty. Falling back to authored order alone would make what a
 * mental-family user gets depend on where in the file someone happened to add
 * a variant.
 *
 * A NO-OP WHEN THERE IS NO CAPTURE. `family` is undefined until the user
 * completes the Remove capture, and an undefined family returns the cell
 * untouched, which is byte-identical to what shipped before this slice.
 */
export function orderForFamily(
  variants: ProtocolVariant[],
  family: RemoveFamily | undefined
): ProtocolVariant[] {
  if (!family) return variants;
  const rank = (v: ProtocolVariant): number =>
    v.family === family ? 0 : v.family === 'behavioral' ? 1 : 2;
  // Index tiebreak keeps the sort stable as a property of this code rather
  // than of the runtime, matching orderForDestination above.
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => rank(a.variant) - rank(b.variant) || a.index - b.index)
    .map((entry) => entry.variant);
}

/**
 * The adjustment the user recorded, as a Recover mechanism, or undefined for
 * every choice that does not name one (slice 7c).
 *
 * THE MAP IS THE WHOLE OF "HONOUR THE RECORDED ADJUSTMENT" ON THE DATA SIDE.
 * Kyle's ruling of 2026-09-17: read `journeyStates.adjustChoice` and map it; no
 * second stored field. So the stored id stays the only record of what the user
 * chose, and this is the one place it becomes a routing input. There is nothing
 * to keep in step, and `CLEARED_OFFERS` nulling `adjustChoice` on every phase
 * change already gives Jen's "temporary" its meaning with no new machinery.
 *
 * THREE OF TWELVE, AND THE OTHER NINE RETURNING undefined IS THE POINT rather
 * than an unhandled case. Jen's ruling 1 of the same day: all twelve stay
 * approved in the content contract, and a phase's options are surfaced only once
 * Vara can materially honour them. Recover's three can be honoured because the
 * cells hold three mechanisms; the other nine cannot, and `rewire` and `refocus`
 * hold ONE variant per cell, so there is nothing to serve whatever the engine
 * did. Step 0 measured that rather than assuming it.
 *
 * SO THIS FUNCTION IS ALSO THE SECOND HALF OF THE ACTIVATION GATE. The surfacing
 * gate (constants/journeyCopy.ts) stops the nine being offered; this stops one
 * that somehow reached the document - a console write, a row predating the gate,
 * a phase changed under a stored choice - from steering anything. A gate on the
 * way in and a gate on the way out, because only the second is total.
 *
 * IT LIVES IN THE ENGINE AND NOT IN constants/journeyCopy.ts, which is where the
 * labels are. This module may import types from `types/models` and nothing else;
 * importing copy into it would invert the dependency and put a string module on
 * the daily serve path. What crosses here is a closed union of twelve ids and a
 * closed union of three mechanisms, both vocabulary rather than copy.
 */
export function adjustmentPreferenceFor(
  choice: AdjustChoiceId | null | undefined
): RecoverMechanism | undefined {
  switch (choice) {
    // "Help me come down" - Downshift. Jen's felt result: "I came down a notch."
    case 'help_me_come_down':
      return 'downshift';
    // "Help me get something back" - Refill. "I have a little more to work with."
    case 'help_me_get_something_back':
      return 'refill';
    // "Help me get re-oriented" - Re-anchor. "I know where I am again."
    case 'help_me_get_re_oriented':
      return 'reanchor';
    default:
      return undefined;
  }
}

/**
 * The preferred mechanism's variant, searching DOWNWARD through capacity
 * (slice 7c; Jen ruling 3, 2026-09-17).
 *
 * "CAPACITY IS A CEILING, NOT A MINIMUM." Her rule: when a preferred mechanism
 * has no protocol fitting the user's available time at their stated capacity,
 * search downward through lower-demand capacity variants of the same mechanism
 * before crossing mechanisms. Never upward. Her worked example, which this
 * reproduces exactly and a test pins: Normal + "Help me get something back"
 * serves R3 at 20+ minutes, R6 at 10-15, and R9 at 5 or less.
 *
 * WHY DOWNWARD AND NOT "THE NEXT SHORTEST VARIANT IN THIS CELL". The cell's
 * shorter variant belongs to a DIFFERENT mechanism, and serving it would answer
 * a question the user did not ask: they said "help me come down" and would get
 * the re-anchor protocol because it happened to be shorter. Crossing mechanisms
 * is the thing this walk exists to avoid, so it walks the axis on which the same
 * mechanism reappears - capacity - and gives up rather than crossing.
 *
 * SCOPED TO THE ADJUSTMENT PATH, AND THAT SCOPE IS KYLE'S (2026-09-17). The
 * general version - walk downward whenever ANY preferred mechanism has no
 * time-fitting variant, including the destination path - is a candidate for a
 * later row and is deliberately not built here. The consequence is stated rather
 * than hidden: after this slice the same user, at the same capacity and the same
 * time answer, is served a 20-minute protocol with no preference recorded and a
 * 5-minute one with a preference recorded. That inconsistency is the argument for
 * the later row and is written into the roadmap entry as such.
 *
 * IT RETURNS undefined RATHER THAN THROWING OR DEFAULTING, and the caller falls
 * through to the ordinary ladder. Today it cannot come up empty - every mechanism
 * holds a `short` variant at `slammed`, pinned by
 * `__tests__/protocolMatrix.mechanisms.test.ts` - but that is a property of the
 * content, not of this function, and `selectProtocol` must stay total whatever
 * the content does. Do not turn this into a non-optional return.
 *
 * RECOVER ONLY. `PROTOCOL_MATRIX.recover` is read directly rather than taking a
 * phase, because no other phase carries mechanisms and a phase parameter would
 * invite a caller to ask a question the other three cannot answer.
 */
export function pickByMechanism(
  capacity: CapacityTier,
  mechanism: RecoverMechanism,
  time: TimeClass
): ProtocolVariant | undefined {
  const asked = TIME_CLASSES.indexOf(time);
  // CAPACITY_TIERS is normal -> limited -> slammed, most demanding first, and it
  // is the single place that order lives. Slicing from the stated tier is what
  // makes "never upward" a property of this code rather than of a comment.
  for (const tier of CAPACITY_TIERS.slice(CAPACITY_TIERS.indexOf(capacity))) {
    const variant = PROTOCOL_MATRIX.recover[tier].find(
      (v) => v.mechanism === mechanism
    );
    // FITS MEANS AT OR BELOW THE ASKED CLASS, the same test the time ladder
    // applies: finishing early is acceptable, overrunning is not.
    if (variant && TIME_CLASSES.indexOf(variant.timeClass) <= asked) return variant;
  }
  return undefined;
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
  destination: DestinationKey,
  removeFamily?: RemoveFamily,
  adjustChoice?: AdjustChoiceId | null
): ProtocolVariant {
  const cell = PROTOCOL_MATRIX[phase][capacity];

  // THE RECORDED ADJUSTMENT, AND IT OUTRANKS THE DESTINATION WHILE ACTIVE
  // (slice 7c; Jen ruling 2, 2026-09-17). Her priority order is: time
  // constraint, capacity constraint, active adjustment preference, destination
  // weighting, repetition/recency. The first two are the cell lookup and the
  // ladder and are unchanged; the third is this branch; the fourth is
  // `orderForDestination` below, which is SKIPPED rather than modified when a
  // preference resolves; the fifth does not exist in this engine and this slice
  // does not build it.
  //
  // WHY A BRANCH AND NOT A FOURTH ORDERING PASS. The two `orderFor*` functions
  // only ORDER, so they compose. This SELECTS, across cells, because the downward
  // search leaves the stated capacity's cell entirely - and a sort cannot express
  // "look in a different cell". Expressing it as an early return is what keeps
  // `orderForFamily`, `orderForDestination` and `pickVariant` unedited, which is
  // the property Kyle's scope call asked for and the 36-row serve table rests on.
  //
  // AN ABSENT OR UNHONOURABLE CHOICE FALLS STRAIGHT THROUGH, byte-for-byte to
  // what shipped before this slice. That is asserted over all 36 Recover triples
  // by `__tests__/noPreferenceServeTable.test.ts` against the NEW signature,
  // because `recoverServeTable.test.ts` calls this with four arguments and cannot
  // see a fifth or a sixth - the same vacuity its own header names about
  // `selectProtocol.test.ts` and ANY_DESTINATION, one axis over.
  if (phase === 'recover') {
    const preference = adjustmentPreferenceFor(adjustChoice);
    if (preference) {
      const preferred = pickByMechanism(capacity, preference, time);
      if (preferred) return preferred;
    }
  }

  // FAMILY ORDERS FIRST, THEN DESTINATION, THEN THE TIME LADDER PICKS. The
  // family is the more specific signal - the user named this thing - so it
  // outranks the destination, which is a standing preference. Both only order;
  // only the time ladder actually chooses.
  //
  // Family applies to REMOVE ONLY. No other phase has a family axis, and
  // consulting it elsewhere would silently reorder cells on a field that means
  // nothing there.
  const byFamily =
    phase === 'remove' ? orderForFamily(cell, removeFamily) : cell;
  return pickVariant(orderForDestination(byFamily, destination), time);
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
