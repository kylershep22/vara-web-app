/**
 * The OutcomeKey <-> DestinationKey vocabulary bridge. Both directions, and
 * nothing else.
 *
 * A LEAF MODULE ON PURPOSE. These are two one-line pure functions over two
 * string unions, and they belong somewhere that imports nothing. They used to
 * live in resolveJourney.ts, which reaches Firestore and analytics; importing
 * one of them from a screen dragged expo-constants and the whole service layer
 * into a test about a single write. A vocabulary mapping should never cost that.
 *
 * THE ONLY ASYMMETRIC PAIR IS stress <-> calm. The other three are spelled the
 * same in both vocabularies, which is exactly why these must be functions and
 * not casts: three-quarters right is what makes a cast survive review.
 */
import type { DestinationKey } from '../types/models';
// OutcomeKey is the ENGINE's union and is re-exported by models rather than
// declared there, so it is imported from its own home.
import type { OutcomeKey } from '../protocolEngine';

/**
 * OutcomeKey -> DestinationKey.
 *
 * READS A LEGACY FIELD TO DERIVE A LIVE ONE, and is not itself legacy. The
 * resolver's migration branch calls it to give a beta account the destination
 * implied by the outcome it had been choosing.
 */
export function destinationForOutcome(outcome: OutcomeKey): DestinationKey {
  return outcome === 'stress' ? 'calm' : outcome;
}

/**
 * `outcomeForDestination`, the inverse, STOOD HERE AND IS GONE (slice 4b).
 *
 * It existed for exactly one caller, the onboarding terminal, and only because
 * `WeeklyCycle.outcome` was a required field. 4b made the field optional and
 * stopped the terminal supplying it, so nothing needs to translate a
 * destination back into an outcome any more.
 *
 * DO NOT REINTRODUCE IT. Anything that appears to need an OutcomeKey derived
 * from a DestinationKey is reaching for the retired axis, and the answer is to
 * stop it rather than to restore the bridge. The surviving direction above is
 * not its round-trip partner: it reads a legacy field to derive a live one,
 * once, for accounts that predate the journey model.
 */
