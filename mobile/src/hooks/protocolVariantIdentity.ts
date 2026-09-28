/**
 * What a committed Today load was resolved FOR, and whether that still holds
 * (STALE-SOURCE-COMPLETION). useTodayCard is the only consumer.
 *
 * A MODULE OF ITS OWN SO THE IDENTITY HAS ONE HOME. A later input to
 * `selectProtocol` that arrives on the source is added to the interface below
 * and to the hook's one builder, and nothing else: the comparison walks every
 * key, so there is no list of fields elsewhere to go stale.
 */
import type {
  AdjustChoiceId,
  DestinationKey,
  PhaseKey,
  RemoveFamily,
} from '../types/models';

/**
 * THE INPUTS FROM THE SOURCE THAT DECIDE WHICH VARIANT IS SERVED.
 *
 * `selectProtocol` takes six arguments and reads nothing else - no clock, no
 * randomness, no module state, only the static matrix. Four of them arrive on
 * the source and are here. The other two are deliberately absent, and a later
 * reader must not "complete" the set by adding them:
 *
 *   CAPACITY AND TIME come off the day's log, not the source. On this device
 *   their only writer is `confirmPick`, which reloads, and the picker opens
 *   only from SetTodayCard, which is never on screen while the hero is. So
 *   neither can move under a rendered card without a reload already covering
 *   it.
 *
 *   ANOTHER DEVICE CAN MOVE THEM, and no stamp would see it: this client never
 *   receives the new values, so a stamp would compare the old values against
 *   themselves. That is a freshness problem, ledgered as
 *   CROSS-CLIENT-STATE-FRESHNESS, not a gap in this identity.
 *
 * `revisionToken` IS NOT HERE EITHER, and `phaseKey` is spelled out rather than
 * inferred from it. Every journeyStates write bumps the token, including the
 * offer exposures Home writes on an ordinary visit, so keying on it would make
 * the CTA go dead on a normal day. And the token can read 0 on both sides of an
 * advance while the server timestamp is unresolved (dayRollover.test.ts pins
 * that), so it cannot stand in for the phase.
 *
 * `cycleId` identifies the day on the legacy path, where the other three are
 * constants and the phase is the cycle's own outcome.
 */
export interface ProtocolVariantIdentity {
  cycleId: string | null;
  phaseKey: PhaseKey | undefined;
  destination: DestinationKey;
  removeFamily: RemoveFamily | undefined;
  adjustChoice: AdjustChoiceId | null;
}

/**
 * The stamp committed in the same batch as the protocol: the date the load
 * read, and the identity it resolved under. ONE STAMP, from which two flags
 * with different meanings are derived; see `staleDate` and `variantStale` on
 * TodayCard.
 */
export interface TodayLoadStamp {
  iso: string;
  variant: ProtocolVariantIdentity;
}

/**
 * Has the variant identity moved since the committed load?
 *
 * TRUE BEFORE ANY LOAD HAS COMMITTED, because nothing is known to be current;
 * `false` there would assert a match that was never made.
 *
 * Field-by-field over EVERY key of the identity, never a hand-written list, so
 * a field added to the interface is compared without anyone remembering to.
 */
export function isVariantStale(
  stamp: TodayLoadStamp | null,
  live: ProtocolVariantIdentity
): boolean {
  if (stamp === null) return true;
  const loaded = stamp.variant;
  return !(Object.keys(live) as (keyof ProtocolVariantIdentity)[]).every(
    (key) => loaded[key] === live[key]
  );
}
