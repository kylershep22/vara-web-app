/**
 * THE FULL ADJUSTMENT SERVE TABLE (journey slice 7c).
 *
 * WHY THIS FILE EXISTS, AND IT IS NOT "more coverage of selectProtocol".
 * Slice 7c lets a user's recorded adjustment steer which Recover mechanism is
 * served, and resolves a mechanism that does not fit their time by walking DOWN
 * through lower-demand capacity variants of the same mechanism. Neither is
 * visible to any suite that existed before it.
 *
 * THE VACUITY THIS FILE EXISTS TO CLOSE, NAMED SO IT CANNOT COME BACK.
 * `recoverServeTable.test.ts` calls `selectProtocol('recover', c, t, d)` with
 * FOUR arguments, over all 36 (capacity x time x destination) triples. A fifth
 * or sixth parameter is invisible to it: every one of its assertions stays green
 * whether this slice is present or fully reverted, and a mutant deleting the
 * preference branch would pass it. That is the same shape its own header names
 * about `selectProtocol.test.ts` and `ANY_DESTINATION = 'focus'`, one axis over,
 * and this is the file that can actually fail.
 *
 * IDENTITY-BASED, NEVER POSITION-BASED, on exactly the precedent
 * `recoverServeTable.test.ts` sets and for the same reasons:
 *
 *   - `id` is `${phase}-${capacity}`, so all three variants of a cell share it.
 *   - `variantKey` is `${phase}-${capacity}-${timeClass}`, so R4, R5 and R6 all
 *     carry `recover-limited-medium` and R7, R8 and R9 all carry
 *     `recover-slammed-short`.
 *   - An index assertion would let R5's expectation pass on R4.
 *
 * Only the title distinguishes these rows, so only the title is asserted.
 *
 * THE SEVEN SEARCH-FIRING ROWS ARE MARKED, AND THE MARK IS ASSERTED rather than
 * being a comment. `searchedDown` is checked against the served variant's own
 * `capacity`: a variant from a lower tier than the user answered is the search
 * having crossed, which is an observable fact about the result and not a claim
 * about the implementation. It is also the exact fact `TodayHeroCard` had to
 * stop rendering (slice 7c commit 5), so pinning it here pins that too.
 */
import { selectProtocol, pickByMechanism, adjustmentPreferenceFor } from '../selectProtocol';
import { CAPACITY_TIERS, PROTOCOL_MATRIX, TIME_CLASSES } from '../protocolMatrix';
import type { CapacityTier, RecoverMechanism, TimeClass } from '../types';
import type { AdjustChoiceId, DestinationKey } from '../../types/models';

/**
 * The three Recover alternatives, Content Pack v1 section 5, "Adjustment set:
 * second phase". Spelled out rather than imported from `ADJUST_ALTERNATIVES`:
 * the engine must not depend on the copy module, and a fixture derived from the
 * thing it checks cannot fail.
 */
const HONOURED: readonly AdjustChoiceId[] = [
  'help_me_come_down',
  'help_me_get_something_back',
  'help_me_get_re_oriented',
];

/** The nine authored Recover titles, by Jen's ordinal (Content Pack v1 section 9). */
const R1 = 'Downshift, then unplug';
const R2 = 'Build a recovery anchor';
const R3 = 'Set the morning signal';
const R4 = 'Exhale, then step away';
const R5 = 'Use a two-part reset';
const R6 = 'Start with light';
const R7 = 'Lengthen the exhale';
const R8 = 'Use one recovery cue';
const R9 = 'Get some morning light';

/** [capacity, time, choice, served title, did the downward search cross a tier] */
type Row = [CapacityTier, TimeClass, AdjustChoiceId, string, boolean];

/**
 * ALL 27 (capacity x time x preference) TRIPLES, MEASURED AGAINST THE SHIPPED
 * MATRIX in Step 0's second pass and typed here as expectations.
 *
 * SEVEN OF THEM FIRE THE DOWNWARD SEARCH and are marked `true`. Nine - every
 * `slammed` row - are inert by construction: all three slammed variants are
 * `short`, so they fit every time answer and the walk never starts.
 */
const SERVE_TABLE: readonly Row[] = [
  // ---- stated capacity: normal ---------------------------------------------
  // A 5-MINUTES-OR-LESS ANSWER AT NORMAL CAPACITY DROPS TWO TIERS, for all
  // three mechanisms, and that is Jen's ruling 3 working rather than a defect.
  // The normal and limited variants of every mechanism are `medium` or `long`;
  // only `slammed` holds anything short. Before this slice these three slots
  // served R1 (15 min), R3 (20 min) and R2 (10 min) to someone who said they
  // had five minutes.
  ['normal', 'short', 'help_me_come_down', R7, true],
  ['normal', 'short', 'help_me_get_something_back', R9, true],
  ['normal', 'short', 'help_me_get_re_oriented', R8, true],

  ['normal', 'medium', 'help_me_come_down', R1, false],
  // JEN'S WORKED EXAMPLE, MIDDLE CASE. R3 is the refill variant at normal and it
  // is `long`; a medium ask never walks up, so the search drops one tier to R6.
  ['normal', 'medium', 'help_me_get_something_back', R6, true],
  ['normal', 'medium', 'help_me_get_re_oriented', R2, false],

  // THE PREFERENCE OUTRANKING DESTINATION, WITH NO TIER CROSSED, AND IT HAS A
  // SIDE EFFECT WORTH KNOWING. Without a preference these three slots all serve
  // R3, because R3 is the cell's only `long` variant and time outranks
  // destination - the two divergences `recoverServeTable.test.ts` pins as
  // "divergence 3" and "divergence 4". With a preference the mechanism is chosen
  // first, so Jen's section 11 table is honoured here where the destination path
  // structurally cannot honour it. That is a consequence of ruling 2, not a fix
  // this slice set out to make, and it is recorded so it is not mistaken for one.
  ['normal', 'long', 'help_me_come_down', R1, false],
  ['normal', 'long', 'help_me_get_something_back', R3, false],
  ['normal', 'long', 'help_me_get_re_oriented', R2, false],

  // ---- stated capacity: limited --------------------------------------------
  ['limited', 'short', 'help_me_come_down', R7, true],
  ['limited', 'short', 'help_me_get_something_back', R9, true],
  ['limited', 'short', 'help_me_get_re_oriented', R8, true],

  // THE LIMITED CELL IS ALL `medium`, so every non-short answer resolves at the
  // stated tier and Jen's section 11 pairing is honoured exactly.
  ['limited', 'medium', 'help_me_come_down', R4, false],
  ['limited', 'medium', 'help_me_get_something_back', R6, false],
  ['limited', 'medium', 'help_me_get_re_oriented', R5, false],
  ['limited', 'long', 'help_me_come_down', R4, false],
  ['limited', 'long', 'help_me_get_something_back', R6, false],
  ['limited', 'long', 'help_me_get_re_oriented', R5, false],

  // ---- stated capacity: slammed --------------------------------------------
  // NINE INERT ROWS. All three slammed variants are `short`, so they fit every
  // time answer, the walk never starts, and the preference only decides WHICH of
  // the three - which is what the destination already decided. Included anyway:
  // a table that covered only the interesting rows would stop being able to say
  // the uninteresting ones did not move.
  ['slammed', 'short', 'help_me_come_down', R7, false],
  ['slammed', 'short', 'help_me_get_something_back', R9, false],
  ['slammed', 'short', 'help_me_get_re_oriented', R8, false],
  ['slammed', 'medium', 'help_me_come_down', R7, false],
  ['slammed', 'medium', 'help_me_get_something_back', R9, false],
  ['slammed', 'medium', 'help_me_get_re_oriented', R8, false],
  ['slammed', 'long', 'help_me_come_down', R7, false],
  ['slammed', 'long', 'help_me_get_something_back', R9, false],
  ['slammed', 'long', 'help_me_get_re_oriented', R8, false],
];

const ALL_NINE = [R1, R2, R3, R4, R5, R6, R7, R8, R9] as const;

/** Destination is irrelevant on this path and every row proves it separately. */
const ANY_DESTINATION: DestinationKey = 'focus';

describe('the adjustment serve table (slice 7c)', () => {
  /**
   * THE FIXTURE'S OWN GUARD, AND IT RUNS FIRST FOR A REASON.
   *
   * Every assertion below is driven off SERVE_TABLE. A row quietly deleted from
   * it would remove a case without removing a test, and the file would stay
   * green while covering less - the vacuous-green shape that has bitten this
   * board three times. These checks make completeness a failing condition.
   */
  describe('the fixture is complete before anything is asserted with it', () => {
    it('holds all 27 triples, each exactly once', () => {
      expect(SERVE_TABLE).toHaveLength(27);
      const keys = SERVE_TABLE.map(([c, t, choice]) => `${c}/${t}/${choice}`);
      expect(new Set(keys).size).toBe(27);
    });

    it('covers the real axes, not a stale copy of them', () => {
      // DERIVED FROM THE EXPORTED AXES crossed with the three honoured ids,
      // rather than from three hand-typed lists: if a capacity tier or a time
      // class is ever added, this goes red instead of the table silently
      // under-covering the space.
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const choice of HONOURED) {
            expect(
              SERVE_TABLE.some(
                ([c, t, ch]) => c === capacity && t === time && ch === choice
              )
            ).toBe(true);
          }
        }
      }
    });

    it('the three honoured ids are exactly the ones that map to a mechanism', () => {
      // The fixture's own claim about WHICH three, checked against the mapping
      // rather than restated. A fourth id becoming honourable without this file
      // noticing is how the table would start under-covering by one.
      for (const choice of HONOURED) {
        expect(adjustmentPreferenceFor(choice)).toBeDefined();
      }
      const others: readonly AdjustChoiceId[] = [
        'make_it_smaller',
        'try_another_way',
        'work_on_something_else',
        'make_it_easier',
        'put_it_somewhere_better',
        'give_it_a_stronger_cue',
        'narrow_what_matters',
        'give_it_some_room',
        'come_back_to_why',
      ];
      expect(others).toHaveLength(9);
      for (const choice of others) {
        expect(adjustmentPreferenceFor(choice)).toBeUndefined();
      }
    });

    it('expects only titles that actually exist in the Recover phase', () => {
      const authored = CAPACITY_TIERS.flatMap((capacity) =>
        PROTOCOL_MATRIX.recover[capacity].map((v) => v.name)
      );
      for (const title of ALL_NINE) expect(authored).toContain(title);
      for (const [, , , title] of SERVE_TABLE) expect(ALL_NINE).toContain(title);
    });

    it('marks exactly seven rows as firing the downward search', () => {
      // The count is itself a finding: Step 0 measured seven, and a change to
      // the rule or to a duration that made it eight or six should say so here
      // rather than in a walk.
      expect(SERVE_TABLE.filter(([, , , , down]) => down)).toHaveLength(7);
    });
  });

  it.each(SERVE_TABLE)(
    'recover / %s / %s / %s serves "%s"',
    (capacity, time, choice, title) => {
      expect(
        selectProtocol('recover', capacity, time, ANY_DESTINATION, undefined, choice).name
      ).toBe(title);
    }
  );

  it.each(SERVE_TABLE)(
    'recover / %s / %s / %s crossed a capacity tier: %s -> %s',
    (capacity, time, choice, title, searchedDown) => {
      const served = selectProtocol(
        'recover',
        capacity,
        time,
        ANY_DESTINATION,
        undefined,
        choice
      );
      // OBSERVED ON THE RESULT, not asserted about the implementation: a served
      // variant whose own capacity is not the one the user answered is the
      // search having crossed. Reported as a labelled string so a failure names
      // the row rather than printing `false !== true`.
      expect(`${title}: ${served.capacity !== capacity}`).toBe(
        `${title}: ${searchedDown}`
      );
      expect(served.capacity === capacity).toBe(!searchedDown);
    }
  );

  describe('the destination cannot change an honoured serve', () => {
    it('all four destinations serve the same protocol once a preference is active', () => {
      // RULING 2, ASSERTED: the preference OUTRANKS destination weighting while
      // active. Without this, a table built on one destination could not tell
      // "the preference decided" from "focus happened to agree".
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const choice of HONOURED) {
            const names = (['focus', 'calm', 'routines', 'energy'] as const).map(
              (destination) =>
                selectProtocol('recover', capacity, time, destination, undefined, choice)
                  .name
            );
            expect(new Set(names).size).toBe(1);
          }
        }
      }
    });
  });

  describe('the walk never goes upward and never crosses mechanisms', () => {
    it('every served variant belongs to the mechanism the user asked for', () => {
      // THE PROPERTY THE WHOLE RULE EXISTS TO PROTECT. A shorter variant of a
      // DIFFERENT mechanism is always available in the same cell and is exactly
      // what must never be served: the user said "help me come down" and must
      // not be handed the re-anchor protocol because it happened to be shorter.
      for (const [capacity, time, choice, title] of SERVE_TABLE) {
        const expected = adjustmentPreferenceFor(choice) as RecoverMechanism;
        const served = selectProtocol(
          'recover',
          capacity,
          time,
          ANY_DESTINATION,
          undefined,
          choice
        );
        expect(`${title}: ${served.mechanism}`).toBe(`${title}: ${expected}`);
      }
    });

    it('never serves a variant from a tier ABOVE the one the user stated', () => {
      for (const [capacity, time, choice] of SERVE_TABLE) {
        const served = selectProtocol(
          'recover',
          capacity,
          time,
          ANY_DESTINATION,
          undefined,
          choice
        );
        expect(
          CAPACITY_TIERS.indexOf(served.capacity)
        ).toBeGreaterThanOrEqual(CAPACITY_TIERS.indexOf(capacity));
      }
    });

    it('never serves a protocol longer than the time the user answered', () => {
      // THE OVERRUN IS GONE ON THIS PATH, and that is worth an assertion rather
      // than a note: `pickVariant` step 3 can overrun when a cell holds nothing
      // at or below the asked class, which is how the destination path serves a
      // 20-minute protocol to a five-minute answer. The downward search has a
      // lower tier to reach for instead, so it never has to.
      for (const [capacity, time, choice] of SERVE_TABLE) {
        const served = selectProtocol(
          'recover',
          capacity,
          time,
          ANY_DESTINATION,
          undefined,
          choice
        );
        expect(TIME_CLASSES.indexOf(served.timeClass)).toBeLessThanOrEqual(
          TIME_CLASSES.indexOf(time)
        );
      }
    });
  });

  describe("Jen's ruling 3 worked example, as she wrote it", () => {
    // "Normal + Help me get something back: 20+ -> R3, 10-15 -> R6, <=5 -> R9."
    // Asserted separately from the table above, and deliberately redundant with
    // three of its rows: this is the case the rule was delivered with, and a
    // reader looking for it should find it under its own name rather than by
    // locating three lines in a 27-row fixture.
    it.each([
      ['long', R3],
      ['medium', R6],
      ['short', R9],
    ] as const)('normal capacity, %s time, serves "%s"', (time, title) => {
      expect(
        selectProtocol(
          'recover',
          'normal',
          time,
          ANY_DESTINATION,
          undefined,
          'help_me_get_something_back'
        ).name
      ).toBe(title);
    });
  });

  describe('the nine unhonoured ids steer nothing', () => {
    it.each([
      'make_it_smaller',
      'try_another_way',
      'work_on_something_else',
      'make_it_easier',
      'put_it_somewhere_better',
      'give_it_a_stronger_cue',
      'narrow_what_matters',
      'give_it_some_room',
      'come_back_to_why',
    ] as const)('%s on a recover document changes nothing', (choice) => {
      // THE SECOND HALF OF THE ACTIVATION GATE. The surfacing gate stops these
      // being offered; this proves one that somehow reached the document cannot
      // steer anything anyway. A console write, a row predating the gate, or a
      // phase changed under a stored choice all produce exactly this state.
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const destination of ['focus', 'calm', 'routines', 'energy'] as const) {
            expect(
              selectProtocol('recover', capacity, time, destination, undefined, choice).name
            ).toBe(selectProtocol('recover', capacity, time, destination).name);
          }
        }
      }
    });
  });

  describe('no phase but recover consults the preference', () => {
    it.each(['remove', 'rewire', 'refocus'] as const)(
      '%s serves the same protocol with and without an honoured choice',
      (phase) => {
        for (const capacity of CAPACITY_TIERS) {
          for (const time of TIME_CLASSES) {
            for (const choice of HONOURED) {
              expect(
                selectProtocol(phase, capacity, time, ANY_DESTINATION, undefined, choice)
                  .name
              ).toBe(selectProtocol(phase, capacity, time, ANY_DESTINATION).name);
            }
          }
        }
      }
    );
  });

  describe('pickByMechanism on its own terms', () => {
    it('resolves every mechanism from every tier at every time answer', () => {
      // TOTALITY OVER THE WHOLE SPACE. `selectProtocol` falls through to the
      // ordinary ladder when this returns undefined, so an undefined here would
      // be silent - the day would still serve something, just not what the user
      // asked for. Checked directly so the silence has a witness.
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const mechanism of ['downshift', 'refill', 'reanchor'] as const) {
            expect(pickByMechanism(capacity, mechanism, time)).toBeDefined();
          }
        }
      }
    });
  });
});
