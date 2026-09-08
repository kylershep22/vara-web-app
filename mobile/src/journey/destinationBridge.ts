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
 * DestinationKey -> OutcomeKey. The inverse, and TEMPORARY.
 *
 * EXISTS FOR EXACTLY ONE CALLER: the onboarding terminal, which still opens the
 * first weekly cycle with an `outcome` because `WeeklyCycle.outcome` is a
 * required field with two live readers. Slice 4a deliberately changed nothing
 * downstream of that write.
 *
 * DIES IN SLICE 4b, which makes the field optional, guards both readers and
 * stops the rollover defaulting to 'focus'. When the cycle no longer carries an
 * outcome, nothing needs to translate a destination back into one and this
 * function has no callers left. Do not grow a second caller in the meantime: if
 * something else appears to need an OutcomeKey from a DestinationKey it is
 * reaching for the retired axis, and the answer is to stop it rather than to
 * reuse this.
 *
 * NOT A REVIVAL OF `legacyOutcomeFor`, which slice 3a removed from the ENGINE
 * path. That one translated on every protocol resolution; this one runs once
 * per user, at onboarding, to fill a field that is on its way out.
 */
export function outcomeForDestination(destination: DestinationKey): OutcomeKey {
  return destination === 'calm' ? 'stress' : destination;
}
