/**
 * THE FULL RECOVER SERVE TABLE, AND THE PROOF THAT NO VARIANT IS DARK.
 *
 * WHY THIS FILE EXISTS, AND IT IS NOT "more coverage of selectProtocol".
 * Slice 7l closed a defect in which five of the nine authored Recover
 * protocols - R2, R5, R6, R8 and R9 - could not be served to anyone. The fix
 * was nine `destinationWeight` values and no logic. A data fix needs a data
 * test, and the existing suite could not be it.
 *
 * THE VACUITY THIS FILE EXISTS TO CLOSE, NAMED SO IT CANNOT COME BACK.
 * `selectProtocol.test.ts` declares `ANY_DESTINATION = 'focus'` and passes it
 * to every `selectProtocol` call it makes. Under Jen's weighting Focus leads to
 * R1 / R4 / R7 - which is exactly what was served BEFORE 7l, when index alone
 * decided. So every assertion in that file stays green whether the nine weights
 * are present or absent. Reverting all nine would leave it fully passing.
 * Focus is the one destination that cannot detect this slice, and it was the
 * only one the suite ever looked at.
 *
 * IDENTITY-BASED, NEVER POSITION-BASED, AND THE DISTINCTION IS LOAD-BEARING.
 * Expectations below are the protocol's `name` - the actual authored string.
 * They are deliberately NOT `id`, NOT `variantKey` and NOT an array index:
 *
 *   - `id` is `${phase}-${capacity}`, so all three variants of a cell share it.
 *   - `variantKey` is `${phase}-${capacity}-${timeClass}`, so R4, R5 and R6 all
 *     carry `recover-limited-medium` and R7, R8 and R9 all carry
 *     `recover-slammed-short`. (`types.ts` calls it "unique per variant"; that
 *     comment has been wrong since the 3b-ii-a reshape and is backlogged.)
 *   - An index assertion would let R5's expectation pass on R4.
 *
 * Only the title distinguishes these rows, so only the title is asserted.
 *
 * THE R-ORDINALS ARE JEN'S KEY, not a scheme invented here. Content Pack v1 §9
 * keys her twelve rows by "ordinal + cell slot + current title", following
 * source order in PROTOCOL_MATRIX: recover normal x3, limited x3, slammed x3.
 */
import { selectProtocol } from '../selectProtocol';
import { CAPACITY_TIERS, PROTOCOL_MATRIX, TIME_CLASSES } from '../protocolMatrix';
import type { CapacityTier, TimeClass } from '../types';
import type { DestinationKey } from '../../types/models';

const DESTINATIONS: readonly DestinationKey[] = ['focus', 'calm', 'routines', 'energy'];

/**
 * The nine authored Recover titles, by Jen's ordinal.
 *
 * Spelled out rather than read out of the matrix ON PURPOSE. A fixture derived
 * from the thing it checks cannot fail: if these were `PROTOCOL_MATRIX.recover
 * .normal[1].name`, an accidental edit to the copy would silently update the
 * expectation along with the code and this file would report success. The
 * strings are Jen's approved copy and a mismatch here is a real finding, so
 * they are typed.
 */
const R1 = 'Downshift, then unplug';
const R2 = 'Build a recovery anchor';
const R3 = 'Set the morning signal';
const R4 = 'Exhale, then step away';
const R5 = 'Use a two-part reset';
const R6 = 'Start with light';
const R7 = 'Lengthen the exhale';
const R8 = 'Use one recovery cue';
const R9 = 'Get some morning light';

const ALL_NINE = [R1, R2, R3, R4, R5, R6, R7, R8, R9] as const;

type Row = [CapacityTier, TimeClass, DestinationKey, string];

/**
 * ALL 36 (capacity x time x destination) TRIPLES, MEASURED AGAINST THE SHIPPED
 * MATRIX RATHER THAN COPIED OUT OF JEN'S TABLE.
 *
 * Jen's delivered table is four destinations by three capacities - twelve
 * cells - and says nothing about time, because time is the other axis. Crossing
 * it with the three time classes gives the 36 below, and FOUR OF THEM DO NOT
 * MATCH HER TABLE. Those four are marked and explained inline. They are written
 * here as what the engine does, not as what the table wishes it did, because a
 * test that asserts the intention rather than the behaviour is a test that goes
 * red on a correct build.
 */
const SERVE_TABLE: readonly Row[] = [
  // ---- recover.normal -----------------------------------------------------
  // THE ONLY MIXED-CLASS CELL IN THE PHASE: R1 medium (15), R2 medium (10),
  // R3 long (20). Every divergence from Jen's table in this file is in this
  // cell, and all four have the same cause.
  ['normal', 'short', 'focus', R1],
  ['normal', 'short', 'calm', R1],
  ['normal', 'short', 'routines', R2],
  // DIVERGENCE 1 of 4 - and the sharpest of them. Energy's weighted lead is R3,
  // a TWENTY-MINUTE protocol, served to someone who answered "5 minutes or
  // less". This is `pickVariant` step 3 (`return variants[0]`) reading the
  // REORDERED array: the cell holds nothing at or below `short`, so the ladder
  // falls to the head, and weighting is what put R3 there. The overrun itself
  // is pre-existing and deliberate ("a protocol the user has to trim beats a
  // blank card") - before 7l this slot served R1 at 15 minutes. 7l makes it
  // five minutes worse, for Energy only. Raised with Jen after the walk; the
  // engine's behaviour is correct and the question is a content one.
  ['normal', 'short', 'energy', R3],

  ['normal', 'medium', 'focus', R1],
  ['normal', 'medium', 'calm', R1],
  ['normal', 'medium', 'routines', R2],
  // DIVERGENCE 2 of 4. Jen's table routes Energy/Normal to R3, but R3 is `long`
  // and a `medium` ask never walks UP - the ladder descends only, because
  // serving something longer spends time the user said they did not have. R3 is
  // ineligible, so Energy falls to the highest-weighted MEDIUM variant, which
  // is R1. Not fixable by weighting: no weight can make a long variant fit a
  // medium answer.
  ['normal', 'medium', 'energy', R1],

  // DIVERGENCES 3 and 4, and the identical case for Routines. On a `long` ask,
  // R3 is the cell's only long variant, so `pickVariant` matches the asked
  // class and returns it whatever the weights say. TIME OUTRANKS DESTINATION BY
  // CONSTRUCTION, which is the design: time answers "what can this person do
  // with the time they have", destination answers "which version of this fits
  // why they are here", and the first question is the harder constraint.
  //
  // THE ALIGNING EDIT IS FORBIDDEN, WHICH IS WHY THIS IS PINNED RATHER THAN
  // FIXED. The only change that would make Calm/Focus get R1 and Routines get
  // R2 here is moving R3's 20 minutes below the 15-minute boundary. That is
  // route (b), rejected by Jen, and Protocol Engine Contract 11.1 forbids it
  // outright: `estMinutes` is a routing input, crossing 5 or 15 re-slots a
  // variant, and doing so "can silently break the destination matrix by moving
  // a variant out of the set its destination weight assumes".
  ['normal', 'long', 'focus', R3], // divergence 3: Jen's table says R1
  ['normal', 'long', 'calm', R3], // divergence 3 (shared pathway)
  ['normal', 'long', 'routines', R3], // divergence 4: Jen's table says R2
  ['normal', 'long', 'energy', R3], // matches Jen's table

  // ---- recover.limited ----------------------------------------------------
  // SINGLE-CLASS CELL: R4, R5 and R6 are all `medium` (10, 6, 10). With one
  // class there is nothing for the time ladder to choose between, so the
  // destination sort decides outright and Jen's table is honoured exactly, at
  // every time answer. R5 holding at 6 rather than 5 is what keeps it that way
  // (contract 11.1's worked example).
  ['limited', 'short', 'focus', R4],
  ['limited', 'short', 'calm', R4],
  ['limited', 'short', 'routines', R5],
  ['limited', 'short', 'energy', R6],
  ['limited', 'medium', 'focus', R4],
  ['limited', 'medium', 'calm', R4],
  ['limited', 'medium', 'routines', R5],
  ['limited', 'medium', 'energy', R6],
  ['limited', 'long', 'focus', R4],
  ['limited', 'long', 'calm', R4],
  ['limited', 'long', 'routines', R5],
  ['limited', 'long', 'energy', R6],

  // ---- recover.slammed ----------------------------------------------------
  // SINGLE-CLASS CELL: R7, R8 and R9 are all `short` (2, 2, 5). Same as limited
  // above - Jen's table is honoured at every time answer.
  ['slammed', 'short', 'focus', R7],
  ['slammed', 'short', 'calm', R7],
  ['slammed', 'short', 'routines', R8],
  ['slammed', 'short', 'energy', R9],
  ['slammed', 'medium', 'focus', R7],
  ['slammed', 'medium', 'calm', R7],
  ['slammed', 'medium', 'routines', R8],
  ['slammed', 'medium', 'energy', R9],
  ['slammed', 'long', 'focus', R7],
  ['slammed', 'long', 'calm', R7],
  ['slammed', 'long', 'routines', R8],
  ['slammed', 'long', 'energy', R9],
];

describe('the Recover serve table (slice 7l)', () => {
  /**
   * THE FIXTURE'S OWN GUARD, AND IT RUNS FIRST FOR A REASON.
   *
   * Every assertion below is driven off SERVE_TABLE. A row quietly deleted from
   * it would remove a case without removing a test, and the file would stay
   * green while covering less - the exact shape of vacuous-green that has bitten
   * this board before. These three checks make the table's completeness a
   * failing condition rather than a reading exercise.
   */
  describe('the fixture is complete before anything is asserted with it', () => {
    it('holds all 36 triples, each exactly once', () => {
      expect(SERVE_TABLE).toHaveLength(36);
      const keys = SERVE_TABLE.map(([c, t, d]) => `${c}/${t}/${d}`);
      expect(new Set(keys).size).toBe(36);
    });

    it('covers the real axes, not a stale copy of them', () => {
      // Derived from the exported axes rather than from three hand-typed lists:
      // if a capacity tier or a time class is ever added, this goes red instead
      // of the table silently under-covering the matrix.
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const destination of DESTINATIONS) {
            expect(
              SERVE_TABLE.some(
                ([c, t, d]) => c === capacity && t === time && d === destination
              )
            ).toBe(true);
          }
        }
      }
    });

    it('expects only titles that actually exist in the Recover phase', () => {
      // Catches a typo in an expected string as a clear failure here, rather
      // than as a confusing serve mismatch thirty-six rows later.
      const authored = CAPACITY_TIERS.flatMap((capacity) =>
        PROTOCOL_MATRIX.recover[capacity].map((v) => v.name)
      );
      for (const title of ALL_NINE) expect(authored).toContain(title);
      for (const [, , , title] of SERVE_TABLE) expect(ALL_NINE).toContain(title);
    });
  });

  it.each(SERVE_TABLE)(
    'recover / %s / %s / %s serves "%s"',
    (capacity, time, destination, title) => {
      expect(selectProtocol('recover', capacity, time, destination).name).toBe(title);
    }
  );

  /**
   * THE DEFECT ITSELF, ASSERTED AS ITS OWN INVERSE.
   *
   * The serve table above pins WHAT is served. This pins that NOTHING IS LEFT
   * OUT, which is the thing row 7l actually existed to fix, and it is a
   * different claim: the table could be edited into internal consistency while
   * still leaving a variant dark. Enumerated over the real axes, not read off
   * the fixture.
   */
  describe('no Recover variant is dark', () => {
    it.each(CAPACITY_TIERS)('every variant of recover.%s is reachable', (capacity) => {
      const cell = PROTOCOL_MATRIX.recover[capacity];
      // THE NON-EMPTINESS GUARD, AND IT IS NOT DECORATION. Without it, a cell
      // that became empty would make the set difference below trivially empty
      // and this test would pass by having nothing to check.
      expect(cell).toHaveLength(3);

      const served = new Set<string>();
      for (const time of TIME_CLASSES) {
        for (const destination of DESTINATIONS) {
          served.add(selectProtocol('recover', capacity, time, destination).name);
        }
      }

      // Named rather than counted: a failure should say WHICH protocol is dark.
      const dark = cell.map((v) => v.name).filter((name) => !served.has(name));
      expect(dark).toEqual([]);
      expect(served.size).toBe(3);
    });

    it('reaches all nine authored Recover protocols across the whole phase', () => {
      const served = new Set<string>();
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const destination of DESTINATIONS) {
            served.add(selectProtocol('recover', capacity, time, destination).name);
          }
        }
      }
      // The five that could not be served to anyone before this slice, named
      // individually so a regression says which one went dark again.
      for (const title of [R2, R5, R6, R8, R9]) expect([...served]).toContain(title);
      expect(served.size).toBe(9);
      expect([...served].sort()).toEqual([...ALL_NINE].sort());
    });
  });
});
