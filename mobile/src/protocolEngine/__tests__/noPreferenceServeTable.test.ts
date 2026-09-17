/**
 * THE 36 CELLS, THROUGH THE NEW SIGNATURE, WITH NO PREFERENCE (slice 7c).
 *
 * WHY THIS FILE EXISTS, AND IT IS THE WHOLE OF KYLE'S "THE 36-ROW SERVE TABLE
 * MUST NOT MOVE". `recoverServeTable.test.ts` already asserts these 36 results
 * and is deliberately NOT edited by this slice - but it calls
 * `selectProtocol('recover', c, t, d)` with FOUR arguments, so a fifth or sixth
 * parameter is invisible to it. It stays green whether this slice shipped or was
 * reverted, which means it pins the old behaviour by BEING UNEDITED and not by
 * being able to fail. That is a documentation property, not a test property.
 *
 * SO THIS FILE ASSERTS THE SAME 36 RESULTS THROUGH THE SIGNATURE THAT ACTUALLY
 * SHIPPED, passing the preference EXPLICITLY ABSENT. Both spellings are checked -
 * omitted entirely, `undefined`, and `null` - because a document written before
 * slice 7b has no `adjustChoice` at all, `CLEARED_OFFERS` writes a typed `null`,
 * and `useTodayCard` passes whichever it finds. All three are the same fact and
 * must produce the same day.
 *
 * DUPLICATION WITH `recoverServeTable.test.ts` IS DELIBERATE AND IS NOT DRIFT.
 * The two files answer different questions: that one asks whether the
 * destination weighting is right, this one asks whether adding a parameter moved
 * anything. If they ever disagree, the engine has a real defect and two files
 * saying so is better than one. The expectations here are typed independently
 * rather than imported from there, on that file's own rule: a fixture derived
 * from the thing it checks cannot fail.
 */
import { selectProtocol } from '../selectProtocol';
import { CAPACITY_TIERS, PROTOCOL_MATRIX, TIME_CLASSES } from '../protocolMatrix';
import type { CapacityTier, TimeClass } from '../types';
import type { DestinationKey } from '../../types/models';

const DESTINATIONS: readonly DestinationKey[] = ['focus', 'calm', 'routines', 'energy'];

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

const ALL_NINE = [R1, R2, R3, R4, R5, R6, R7, R8, R9] as const;

type Row = [CapacityTier, TimeClass, DestinationKey, string];

/**
 * ALL 36 TRIPLES AS THEY SERVED BEFORE THIS SLICE, measured on `main` at
 * `756314b` and typed here.
 *
 * FOUR OF THEM DIVERGE FROM JEN'S SECTION 11 TABLE and are marked, exactly as
 * `recoverServeTable.test.ts` marks them. They are reproduced here as WHAT THE
 * ENGINE DOES rather than what the table wishes it did, because a test that
 * asserts the intention goes red on a correct build - and because this file's
 * entire job is "unchanged", which means unchanged including the parts nobody
 * likes.
 */
const HEAD_TABLE: readonly Row[] = [
  // ---- recover.normal ------------------------------------------------------
  ['normal', 'short', 'focus', R1],
  ['normal', 'short', 'calm', R1],
  ['normal', 'short', 'routines', R2],
  // DIVERGENCE 1 of 4: a 20-minute protocol served to a five-minutes-or-less
  // answer. Raised with Jen after 7l's walk and still open. Slice 7c does NOT
  // fix it here - Kyle scoped the downward search to the adjustment path - and
  // the inconsistency that creates is recorded in the roadmap entry.
  ['normal', 'short', 'energy', R3],

  ['normal', 'medium', 'focus', R1],
  ['normal', 'medium', 'calm', R1],
  ['normal', 'medium', 'routines', R2],
  // DIVERGENCE 2 of 4: R3 is `long` and a `medium` ask never walks up.
  ['normal', 'medium', 'energy', R1],

  // DIVERGENCES 3 and 4: R3 is the cell's only `long` variant, so it answers a
  // `long` ask whatever the weights say. Time outranks destination by
  // construction. Note that the ADJUSTMENT path reaches R1 and R2 at these
  // slots, because the mechanism is chosen before the ladder runs - see
  // adjustmentServeTable.test.ts. Both are correct; they are different paths.
  ['normal', 'long', 'focus', R3],
  ['normal', 'long', 'calm', R3],
  ['normal', 'long', 'routines', R3],
  ['normal', 'long', 'energy', R3],

  // ---- recover.limited -----------------------------------------------------
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

  // ---- recover.slammed -----------------------------------------------------
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

describe('no preference reproduces HEAD (slice 7c)', () => {
  describe('the fixture is complete before anything is asserted with it', () => {
    it('holds all 36 triples, each exactly once', () => {
      expect(HEAD_TABLE).toHaveLength(36);
      const keys = HEAD_TABLE.map(([c, t, d]) => `${c}/${t}/${d}`);
      expect(new Set(keys).size).toBe(36);
    });

    it('covers the real axes, not a stale copy of them', () => {
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const destination of DESTINATIONS) {
            expect(
              HEAD_TABLE.some(
                ([c, t, d]) => c === capacity && t === time && d === destination
              )
            ).toBe(true);
          }
        }
      }
    });

    it('expects only titles that actually exist in the Recover phase', () => {
      const authored = CAPACITY_TIERS.flatMap((capacity) =>
        PROTOCOL_MATRIX.recover[capacity].map((v) => v.name)
      );
      for (const title of ALL_NINE) expect(authored).toContain(title);
      for (const [, , , title] of HEAD_TABLE) expect(ALL_NINE).toContain(title);
    });
  });

  describe('the preference omitted entirely, which is every legacy caller', () => {
    it.each(HEAD_TABLE)('recover / %s / %s / %s serves "%s"', (c, t, d, title) => {
      expect(selectProtocol('recover', c, t, d).name).toBe(title);
    });
  });

  describe('the preference passed EXPLICITLY ABSENT, which is the new call site', () => {
    // THE ONE THAT `recoverServeTable.test.ts` CANNOT MAKE. Four arguments
    // cannot detect a sixth; six arguments with the sixth absent can.
    it.each(HEAD_TABLE)(
      'recover / %s / %s / %s serves "%s" with undefined',
      (c, t, d, title) => {
        expect(selectProtocol('recover', c, t, d, undefined, undefined).name).toBe(title);
      }
    );

    it.each(HEAD_TABLE)(
      'recover / %s / %s / %s serves "%s" with null',
      (c, t, d, title) => {
        // `CLEARED_OFFERS` writes a typed null on every phase change, so this is
        // the shape on the document for every user who has changed phase without
        // making a choice since. 7b's walk-script correction 4 is the reason it
        // is checked separately from undefined: an empty string reads as
        // present-and-empty to a `??`, and a null does not.
        expect(selectProtocol('recover', c, t, d, undefined, null).name).toBe(title);
      }
    );
  });

  it('the three spellings of absence are the same day, cell for cell', () => {
    // Asserted as equality between the three rather than three times against the
    // fixture, so a fixture that drifted could not hide a divergence between
    // them.
    for (const [c, t, d] of HEAD_TABLE) {
      const omitted = selectProtocol('recover', c, t, d).name;
      const undef = selectProtocol('recover', c, t, d, undefined, undefined).name;
      const nul = selectProtocol('recover', c, t, d, undefined, null).name;
      expect(`${c}/${t}/${d}: ${undef}|${nul}`).toBe(`${c}/${t}/${d}: ${omitted}|${omitted}`);
    }
  });

  describe('no Recover variant went dark when the parameter was added', () => {
    // 7l's defect, re-asserted on the new signature. The serve table above pins
    // WHAT is served; this pins that nothing is left out, which is a different
    // claim - the table could be edited into internal consistency while still
    // leaving a variant unreachable.
    it('reaches all nine authored Recover protocols with no preference', () => {
      const served = new Set<string>();
      for (const capacity of CAPACITY_TIERS) {
        for (const time of TIME_CLASSES) {
          for (const destination of DESTINATIONS) {
            served.add(
              selectProtocol('recover', capacity, time, destination, undefined, undefined)
                .name
            );
          }
        }
      }
      for (const title of [R2, R5, R6, R8, R9]) expect([...served]).toContain(title);
      expect(served.size).toBe(9);
      expect([...served].sort()).toEqual([...ALL_NINE].sort());
    });
  });

  describe('the other three phases are untouched by the new parameter', () => {
    it.each(['remove', 'rewire', 'refocus'] as const)(
      '%s serves identically with the parameter omitted and explicitly absent',
      (phase) => {
        for (const capacity of CAPACITY_TIERS) {
          for (const time of TIME_CLASSES) {
            for (const destination of DESTINATIONS) {
              const omitted = selectProtocol(phase, capacity, time, destination).name;
              expect(
                selectProtocol(phase, capacity, time, destination, undefined, undefined).name
              ).toBe(omitted);
              expect(
                selectProtocol(phase, capacity, time, destination, undefined, null).name
              ).toBe(omitted);
            }
          }
        }
      }
    );
  });
});
