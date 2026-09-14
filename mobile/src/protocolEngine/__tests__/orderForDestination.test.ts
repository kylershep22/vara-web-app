/**
 * `orderForDestination`, TESTED AGAINST HAND-BUILT WEIGHTED CELLS.
 *
 * WHY THIS FILE EXISTS, AND IT IS NOT A NICE-TO-HAVE. Until slice 7l this
 * function had exactly one test: an assertion that it returned every SHIPPED
 * cell untouched, which was true only because no variant carried a
 * `destinationWeight`. The sort had therefore never executed with a non-zero
 * weight in its life. Its own doc-comment claimed otherwise - "the function is
 * real, it is tested against hand-built weighted cells" - and that claim was
 * false from the day it was written. This file is what makes it true, and the
 * comment was corrected in the same commit.
 *
 * THE SAME GAP `pickVariant.test.ts` WAS CREATED TO CLOSE, one axis over. That
 * file's header: "a mutant that deletes the ladder entirely still passes every
 * test driven off the real matrix". The identity test was worse than that - a
 * mutant replacing this function's body with `return variants` passed it by
 * definition. Synthetic cells are the only way to see the sort work.
 *
 * WHAT THE SHIPPED MATRIX CANNOT EXERCISE, which is why hand-built cells are
 * not merely convenient. Jen's weighting gives every Recover variant a weight
 * of exactly 1 on the destinations it leads and none elsewhere, so the real
 * data never produces a tie between two weighted variants, never carries a
 * weight above 1, and never mixes a weighted and an unweighted variant in one
 * cell. All three shapes are legal, all three are reachable by a future content
 * change, and all three are covered below.
 *
 * ORDERS, NEVER FILTERS, IS THE ONE JEN ACTUALLY RELIES ON. Her delivered
 * constraint was "weighting, not a permanent hard lock: a variant that is not
 * the weighted lead must remain servable, not filtered out". The engine
 * satisfied that before she asked, but nothing asserted it. The length and
 * membership checks below are where that constraint now lives.
 */
import { orderForDestination } from '../selectProtocol';
import type { ProtocolVariant } from '../types';
import type { DestinationKey } from '../../types/models';

/**
 * A variant carrying only what the sort looks at.
 *
 * Same shape as `pickVariant.test.ts`'s helper, and deliberately not shared
 * with it: the two files test different fields, and a shared factory would have
 * to carry both sets and drift toward a fixture neither one wants.
 */
const v = (tag: string, weights?: Partial<Record<DestinationKey, number>>): ProtocolVariant =>
  ({ name: tag, variantKey: tag, destinationWeight: weights }) as ProtocolVariant;

const names = (variants: ProtocolVariant[]): string[] => variants.map((x) => x.name);

describe('orderForDestination', () => {
  describe('it sorts by weight, descending', () => {
    it('puts the highest-weighted variant at the head', () => {
      const cell = [v('a', { calm: 1 }), v('b', { calm: 5 }), v('c', { calm: 3 })];
      expect(names(orderForDestination(cell, 'calm'))).toEqual(['b', 'c', 'a']);
    });

    it('reads ONLY the asked destination weight', () => {
      // The discriminating case for "the destination is an input". A cell
      // ordered for one destination and for another must come back differently,
      // or the parameter is decorative.
      const cell = [v('a', { calm: 9, energy: 0 }), v('b', { calm: 0, energy: 9 })];
      expect(names(orderForDestination(cell, 'calm'))).toEqual(['a', 'b']);
      expect(names(orderForDestination(cell, 'energy'))).toEqual(['b', 'a']);
    });

    it('is the identity on a cell where nobody is weighted for this destination', () => {
      // What the shipped matrix looked like before 7l, and what every non-
      // Recover phase still looks like. Preserved as a property of the sort
      // rather than as a claim about the data.
      const cell = [v('a'), v('b'), v('c')];
      expect(names(orderForDestination(cell, 'routines'))).toEqual(['a', 'b', 'c']);
    });
  });

  describe('an absent weight reads as zero, never as a missing variant', () => {
    it('sorts an unweighted variant below a positively weighted one', () => {
      const cell = [v('unweighted'), v('weighted', { focus: 1 })];
      expect(names(orderForDestination(cell, 'focus'))).toEqual(['weighted', 'unweighted']);
    });

    it('treats a variant weighted for OTHER destinations as unweighted here', () => {
      // `destinationWeight?.[destination] ?? 0` has two coalescing steps and
      // this is the second one: the object exists, the key does not.
      const cell = [v('elsewhere', { calm: 10 }), v('here', { routines: 1 })];
      expect(names(orderForDestination(cell, 'routines'))).toEqual(['here', 'elsewhere']);
    });

    it('sorts an explicit zero exactly as an absent weight', () => {
      const cell = [v('explicit-zero', { energy: 0 }), v('absent')];
      // Equal keys, so authored order decides - the tiebreak below.
      expect(names(orderForDestination(cell, 'energy'))).toEqual(['explicit-zero', 'absent']);
    });

    it('lets a negative weight sort BELOW an absent one', () => {
      // Not a shape Jen has authored, and legal in the type. Recorded so the
      // behaviour is a decision rather than a discovery: zero is the floor for
      // "no preference", and a negative weight is a real demotion past it.
      const cell = [v('demoted', { calm: -1 }), v('neutral')];
      expect(names(orderForDestination(cell, 'calm'))).toEqual(['neutral', 'demoted']);
    });
  });

  describe('equal weights fall back to authored order, stably', () => {
    it('keeps authored order among variants of equal weight', () => {
      const cell = [v('a', { focus: 2 }), v('b', { focus: 2 }), v('c', { focus: 2 })];
      expect(names(orderForDestination(cell, 'focus'))).toEqual(['a', 'b', 'c']);
    });

    it('keeps authored order WITHIN each weight band', () => {
      // The case that separates a stable sort from a merely correct one: two
      // bands, two members each, and the within-band order is the only thing
      // that can go wrong.
      const cell = [
        v('lo-1', { calm: 1 }),
        v('hi-1', { calm: 2 }),
        v('lo-2', { calm: 1 }),
        v('hi-2', { calm: 2 }),
      ];
      expect(names(orderForDestination(cell, 'calm'))).toEqual([
        'hi-1',
        'hi-2',
        'lo-1',
        'lo-2',
      ]);
    });

    it('is stable on a cell large enough to expose an unstable engine sort', () => {
      // STABILITY IS A PROPERTY OF THIS CODE, NOT OF THE RUNTIME, which is the
      // reason `orderForDestination` maps to `{variant, index}` and tiebreaks on
      // the index rather than sorting in place. Some engines switch algorithm
      // above a length threshold, so the guarantee is only visible on a cell
      // bigger than any the matrix holds. Deleting the index tiebreak leaves
      // every shorter case above green.
      const cell = Array.from({ length: 24 }, (_, i) => v(`v${i}`, { energy: 1 }));
      expect(names(orderForDestination(cell, 'energy'))).toEqual(names(cell));
    });
  });

  describe('it ORDERS and never FILTERS', () => {
    /**
     * JEN'S CONSTRAINT, ASSERTED (2026-09-12): "a variant that is not the
     * weighted lead must remain servable, not filtered out". The engine already
     * satisfied it - `types.ts` has said since the reshape that "filtering a
     * cell by destination could empty it, and an empty cell has no protocol to
     * serve; ordering cannot fail" - but until 7l nothing checked.
     *
     * This is also what keeps rotation (roadmap 3b-iii) open: "see other
     * options" walks the cell from the head, and it can only do that if the
     * whole cell is still there.
     */
    it('returns every input variant, for every destination', () => {
      const cell = [v('a', { calm: 3 }), v('b'), v('c', { energy: 1, focus: 2 })];
      for (const destination of ['focus', 'calm', 'routines', 'energy'] as const) {
        const ordered = orderForDestination(cell, destination);
        expect(ordered).toHaveLength(cell.length);
        // Set comparison, so this fails on a DROPPED variant rather than only
        // on a reordered one.
        expect(names(ordered).sort()).toEqual(names(cell).sort());
      }
    });

    it('returns a permutation even when one variant outweighs the rest heavily', () => {
      // The shape most likely to tempt a future "just take the lead" rewrite.
      const cell = [v('a'), v('b', { routines: 1000 }), v('c')];
      const ordered = orderForDestination(cell, 'routines');
      expect(names(ordered)).toEqual(['b', 'a', 'c']);
      expect(ordered).toHaveLength(3);
    });

    it('does not mutate the cell it was given', () => {
      // `Array.sort` sorts in place, so a rewrite that dropped the `.map` would
      // silently reorder PROTOCOL_MATRIX itself - a shared module-level
      // constant - and every later caller would see the last caller's
      // destination. This is the test that catches that.
      const cell = [v('a'), v('b', { calm: 1 })];
      const before = names(cell);
      orderForDestination(cell, 'calm');
      expect(names(cell)).toEqual(before);
    });

    it('handles the degenerate cells without throwing', () => {
      expect(orderForDestination([], 'calm')).toEqual([]);
      const one = [v('only', { calm: 1 })];
      expect(names(orderForDestination(one, 'energy'))).toEqual(['only']);
    });
  });
});
