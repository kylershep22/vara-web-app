/**
 * THE `mechanism` MARKER, AND THE TOTALITY THE DOWNWARD SEARCH RESTS ON
 * (journey slice 7c).
 *
 * WHY THIS FILE EXISTS, AND IT IS NOT "more coverage of the matrix". Slice 7c
 * lets a user's recorded adjustment steer which Recover mechanism is served,
 * and Jen's ruling 3 resolves a mechanism that does not fit the user's time by
 * walking DOWN through lower-demand capacity variants of THE SAME MECHANISM -
 * never upward, never across mechanisms. That walk terminates only because
 * every mechanism holds a `short` variant at `slammed`. THAT IS A PROPERTY OF
 * TODAY'S CONTENT, NOT OF THE RULE, and a rule whose termination depends on
 * content nobody is watching is a rule that falls off the end the first time a
 * cell is edited. This file is what watches it.
 *
 * SAME SHAPE AS `recoverServeTable.test.ts`'s non-emptiness guard, and for the
 * same stated reason: "Without it, a cell that became empty would make the set
 * difference below trivially empty and this test would pass by having nothing
 * to check."
 *
 * IT ALSO PINS THE ONE AGREEMENT THAT IS TRUE BY CONSTRUCTION TODAY AND MAY NOT
 * BE TOMORROW. `mechanism` and `destinationWeight` currently agree - downshift
 * is what Calm and Focus weight, reanchor what Routines weights, refill what
 * Energy weights. They are two different questions (see the field comment in
 * types.ts) and 7c exists partly because one answer was serving both. Asserting
 * the agreement means the day they are meant to diverge, the divergence is a
 * decision somebody makes out loud rather than a drift nobody sees.
 */
import { PROTOCOL_MATRIX, CAPACITY_TIERS, TIME_CLASSES } from '../protocolMatrix';
import type { RecoverMechanism } from '../types';
import type { DestinationKey } from '../../types/models';

const MECHANISMS: readonly RecoverMechanism[] = ['downshift', 'refill', 'reanchor'];

/**
 * The destination(s) each mechanism leads for, per Content Pack v1 section 11.
 *
 * Written out rather than derived from the matrix. A fixture read out of the
 * thing it checks cannot fail.
 */
const WEIGHTED_BY: Record<RecoverMechanism, readonly DestinationKey[]> = {
  downshift: ['calm', 'focus'],
  reanchor: ['routines'],
  refill: ['energy'],
};

describe('the Recover mechanism marker (slice 7c)', () => {
  it('every Recover variant carries a mechanism', () => {
    for (const capacity of CAPACITY_TIERS) {
      const cell = PROTOCOL_MATRIX.recover[capacity];
      // THE NON-EMPTINESS GUARD FIRST. Without it an emptied cell would make
      // the loop below iterate zero times and pass by checking nothing.
      expect(cell).toHaveLength(3);
      for (const variant of cell) {
        expect(MECHANISMS).toContain(variant.mechanism);
      }
    }
  });

  it('no variant outside Recover carries one', () => {
    // RECOVER-PHASE ONLY, on the terms `family` is Remove-phase only. A
    // mechanism on a refocus variant would be a routing key on an axis that
    // phase does not have, and the adjustment path would start consulting it.
    for (const phase of ['remove', 'rewire', 'refocus'] as const) {
      for (const capacity of CAPACITY_TIERS) {
        const cell = PROTOCOL_MATRIX[phase][capacity];
        expect(cell.length).toBeGreaterThan(0);
        for (const variant of cell) {
          expect(variant.mechanism).toBeUndefined();
        }
      }
    }
  });

  it('every mechanism is present exactly once in every capacity tier', () => {
    // THE TOTALITY THE DOWNWARD SEARCH RESTS ON, asserted per tier rather than
    // per phase: the walk steps from one tier to the next and needs the
    // mechanism to exist at the tier it lands on, not merely somewhere.
    for (const capacity of CAPACITY_TIERS) {
      const found = PROTOCOL_MATRIX.recover[capacity].map((v) => v.mechanism);
      expect(found).toHaveLength(3);
      for (const mechanism of MECHANISMS) {
        expect(found.filter((m) => m === mechanism)).toHaveLength(1);
      }
    }
  });

  it('every mechanism has a short variant at slammed, so the walk always terminates', () => {
    // THE TERMINATION CONDITION, NAMED. `slammed` is the last tier the search
    // can reach; a mechanism whose slammed variant were `medium` or `long`
    // would leave a five-minute answer with nothing to serve, and Jen's rule
    // forbids both walking up and crossing mechanisms to recover from it.
    for (const mechanism of MECHANISMS) {
      const variant = PROTOCOL_MATRIX.recover.slammed.find(
        (v) => v.mechanism === mechanism
      );
      expect(variant).toBeDefined();
      expect(variant?.timeClass).toBe('short');
      // Named rather than counted, so a failure says which mechanism stranded.
      expect(`${mechanism}:${variant?.timeClass}`).toBe(`${mechanism}:short`);
    }
  });

  it('a mechanism is reachable at every capacity, at the shortest time answer', () => {
    // The walk's whole space, stated as a property rather than as a table: from
    // ANY starting tier, at the HARDEST time answer, some variant of the asked
    // mechanism is reachable without going up or sideways. The serve table in
    // adjustmentServeTable.test.ts pins WHICH; this pins that there is one.
    const shortest = TIME_CLASSES[0];
    expect(shortest).toBe('short');
    for (const mechanism of MECHANISMS) {
      for (let i = 0; i < CAPACITY_TIERS.length; i++) {
        const reachable = CAPACITY_TIERS.slice(i).some((capacity) =>
          PROTOCOL_MATRIX.recover[capacity].some(
            (v) => v.mechanism === mechanism && v.timeClass === shortest
          )
        );
        expect(`${mechanism}/${CAPACITY_TIERS[i]}:${reachable}`).toBe(
          `${mechanism}/${CAPACITY_TIERS[i]}:true`
        );
      }
    }
  });

  it('mechanism and destinationWeight agree today, and the agreement is a decision', () => {
    for (const capacity of CAPACITY_TIERS) {
      for (const variant of PROTOCOL_MATRIX.recover[capacity]) {
        const mechanism = variant.mechanism as RecoverMechanism;
        const weighted = WEIGHTED_BY[mechanism];
        const actual = Object.entries(variant.destinationWeight ?? {})
          .filter(([, weight]) => (weight ?? 0) > 0)
          .map(([destination]) => destination)
          .sort();
        expect(`${variant.name}: ${actual.join(',')}`).toBe(
          `${variant.name}: ${[...weighted].sort().join(',')}`
        );
      }
    }
  });
});
