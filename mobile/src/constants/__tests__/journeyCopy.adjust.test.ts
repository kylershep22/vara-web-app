/**
 * The C2 adjustment copy, and the one mapping that cannot be left inferable
 * (journey slice 7b).
 *
 * WHAT THIS SUITE IS FOR. Content Pack v1 section 5 names its four alternative
 * sets by ORDINAL - "first phase", "second phase", "third phase", "fourth
 * phase" - and the app keys them by PhaseKey. That translation happened once,
 * by hand, when the constant was written. Nothing at runtime re-derives it, on
 * purpose: an ordinal lookup through PHASE_ORDER would silently re-attach the
 * recover set to whichever phase landed second the day someone reordered the
 * journey, which the roadmap explicitly allows as a product decision.
 *
 * So the mapping is asserted HERE, once, against the pack's own ordinals. If
 * PHASE_ORDER is reordered, this suite fails and asks whether the CONTENT was
 * meant to move with it. That question having to be answered out loud is the
 * entire point.
 */
import { ADJUST_ALTERNATIVES, ADJUST_COPY } from '../journeyCopy';
import { PHASE_ORDER } from '../journey';
import type { PhaseKey } from '../../types/models';

/**
 * The phrase Jen retired on 2026-09-12 (slice 7h), declared once so the
 * exclusion and its anti-vacuity proof cannot drift apart. Two copies of a
 * needle is how one of them stops matching and nobody notices.
 */
const RETIRED_PHRASE = "feeling like it's moving";

describe('the pack ordinal to phase key mapping', () => {
  // The pack's four sets, identified by their first option's label, in the
  // order the pack lists them. Written out rather than read from the constant
  // under test, which would make the assertion circular.
  const PACK_ORDER: ReadonlyArray<[string, string]> = [
    ['first phase', 'Make it smaller'],
    ['second phase', 'Help me come down'],
    ['third phase', 'Make it easier'],
    ['fourth phase', 'Narrow what matters'],
  ];

  test('remove / recover / rewire / refocus are the pack first / second / third / fourth', () => {
    const expected: ReadonlyArray<[PhaseKey, string]> = [
      ['remove', 'Make it smaller'],
      ['recover', 'Help me come down'],
      ['rewire', 'Make it easier'],
      ['refocus', 'Narrow what matters'],
    ];
    for (const [phaseKey, firstLabel] of expected) {
      expect(ADJUST_ALTERNATIVES[phaseKey][0].label).toBe(firstLabel);
    }
  });

  test('the mapping still agrees with PHASE_ORDER today', () => {
    // The ordinal reading, asserted as a CURRENT FACT rather than relied on as
    // a mechanism. This is the test that fails on a reorder, and its failure is
    // the prompt to decide whether the content moves too. It is not licence to
    // replace the keyed constant with a PHASE_ORDER lookup.
    PACK_ORDER.forEach(([, firstLabel], i) => {
      expect(ADJUST_ALTERNATIVES[PHASE_ORDER[i]][0].label).toBe(firstLabel);
    });
  });

  test('every phase has exactly three alternatives', () => {
    for (const phaseKey of PHASE_ORDER) {
      expect(ADJUST_ALTERNATIVES[phaseKey]).toHaveLength(3);
    }
  });

  test('all twelve ids are distinct, so a choice names one option', () => {
    const ids = PHASE_ORDER.flatMap((p) => ADJUST_ALTERNATIVES[p].map((o) => o.id));
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  test('no option id leaks into a label or a body', () => {
    // Ids are vocabulary and labels are copy. A label that read
    // "make_it_smaller" would be the id escaping into the UI, which is the
    // failure the id/label split exists to prevent.
    for (const phaseKey of PHASE_ORDER) {
      for (const option of ADJUST_ALTERNATIVES[phaseKey]) {
        expect(option.label).not.toContain('_');
        expect(option.body).not.toContain('_');
      }
    }
  });
});

describe('the C2 card copy', () => {
  test('builds BOTH bodies from the decisions section 4 amendment, never from an earlier delivery', () => {
    // The superseded body is struck through in the pack itself. Asserting its
    // ABSENCE is what makes reaching for the wrong delivery fail loudly rather
    // than ship a line Jen revised out for overstating what Vara knows.
    //
    // THERE ARE NOW TWO RETIRED WORDINGS, NOT ONE (slice 7h). The pack's own
    // section C2 body was the first; Jen's 2026-09-12 amendment retired the
    // second - the "feeling like it's moving" pair that shipped in 7b - and
    // wrote both bodies rather than one. So both strings are pinned exactly,
    // where 7b pinned only the first: an exact pin on one body and nothing on
    // the other is how half a revision walks back in against a green suite.
    expect(ADJUST_COPY.bodyFirst).toBe(
      "If this isn't helping yet, we can change the approach without starting over."
    );
    expect(ADJUST_COPY.bodySecond).toBe(
      "If this still isn't helping, we can change the approach without starting over."
    );
    for (const body of [ADJUST_COPY.bodyFirst, ADJUST_COPY.bodySecond]) {
      expect(body).not.toContain("hasn't felt very useful");
      expect(body).not.toContain('start over.');
      // The 7b wording, retired 2026-09-12. It borrowed the weekly check-in's
      // own answer vocabulary (`moving` / `not_moving` is the C1 answer set),
      // so the card echoed the user's logged answer back at them - the exact
      // narration decisions section 4 exists to prevent.
      expect(body).not.toContain(RETIRED_PHRASE);
    }
  });

  test('ANTI-VACUITY: the retired phrase still matches the strings it was written to exclude', () => {
    // The three `not.toContain` assertions above are each satisfied by a needle
    // that matches NOTHING - a typo in any of them buys silent green forever,
    // and a negative assertion nobody can see failing is not an assertion.
    // These are the actual strings this slice and slice 7b removed, quoted here
    // so the exclusions are proven to have teeth against real copy rather than
    // against a needle that drifted. Same guard as the notification-claim block
    // in ErrorBoundary.test.tsx (slice 7g).
    const retiredIn7h = [
      "If this isn't feeling like it's moving yet, we can change the approach without starting over.",
      "If this still isn't feeling like it's moving, we can change the approach without starting over.",
    ];
    for (const retired of retiredIn7h) {
      expect(retired).toContain(RETIRED_PHRASE);
      expect(retired).not.toBe(ADJUST_COPY.bodyFirst);
      expect(retired).not.toBe(ADJUST_COPY.bodySecond);
    }
    // The pack's own section C2 body, superseded since 2026-09-05.
    const retiredInPack =
      "This hasn't felt very useful lately. You don't need to start over. We can change how you work on the same part.";
    expect(retiredInPack).toContain("hasn't felt very useful");
    expect(retiredInPack).toContain('start over.');
  });

  test('the two bodies differ by exactly one word, and that word is "still"', () => {
    // R5's continuity clause, held as arithmetic. Anything more than this is
    // the narration the rule rejected.
    const first = ADJUST_COPY.bodyFirst.split(' ');
    const second = ADJUST_COPY.bodySecond.split(' ');
    expect(second).toContain('still');
    expect(first).not.toContain('still');
    // Same sentence otherwise: dropping "still" from the second and "yet" from
    // the first leaves two identical strings.
    const normalise = (s: string) =>
      s.replace(' still', '').replace(' yet', '').replace('  ', ' ');
    expect(normalise(ADJUST_COPY.bodySecond)).toBe(normalise(ADJUST_COPY.bodyFirst));
  });

  test('NOTHING on the card narrates the trigger', () => {
    // The pack's own prohibition: "Do not tell the user that two negative
    // weekly responses triggered this." Two not_moving reads tell us the user
    // does not currently feel movement; they do not tell us the practices were
    // useless, and the card may not say or imply either.
    const surfaces = [
      ADJUST_COPY.title,
      ADJUST_COPY.bodyFirst,
      ADJUST_COPY.bodySecond,
      ADJUST_COPY.primary,
      ADJUST_COPY.decline,
      ADJUST_COPY.alternativesIntro,
      ADJUST_COPY.confirmation,
      ADJUST_COPY.failed,
    ];
    const forbidden = [
      'twice',
      'two weeks',
      'two responses',
      'pattern',
      'noticed',
      'detected',
      "wasn't working",
      'not working',
      'failed',
      'useless',
    ];
    for (const surface of surfaces) {
      for (const phrase of forbidden) {
        expect(surface.toLowerCase()).not.toContain(phrase);
      }
    }
  });

  test('no numbers, no digits, no framework words on any adjust surface', () => {
    // Section 8's three standing bans, on every string the user can meet here,
    // including the twelve alternatives.
    const all = [
      ...Object.values(ADJUST_COPY),
      ...PHASE_ORDER.flatMap((p) =>
        ADJUST_ALTERNATIVES[p].flatMap((o) => [o.label, o.body])
      ),
    ];
    for (const s of all) {
      expect(s).not.toMatch(/\d/);
      expect(s.toLowerCase()).not.toMatch(/\b(remove|recover|rewire|refocus)\b/);
      // The number words the digit check would miss.
      expect(s.toLowerCase()).not.toMatch(/\b(one|two|three|four) (times?|weeks?)\b/);
    }
  });

  test('the intro says three without saying a number', () => {
    // "Three ways" is the one place a count word appears, and it counts the
    // options on screen rather than anything about the user. Pinned so the
    // distinction is deliberate rather than an oversight the next guard trips
    // over: it is not a behavioral count, a streak, or a measure of them.
    expect(ADJUST_COPY.alternativesIntro).toBe(
      'Three ways to change the approach for this stretch.'
    );
    expect(ADJUST_ALTERNATIVES.remove).toHaveLength(3);
  });
});
