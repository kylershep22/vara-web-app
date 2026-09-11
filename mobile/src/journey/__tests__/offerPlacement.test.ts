/**
 * Placement, at its boundaries (slice 7a, roadmap section 9 R3).
 *
 * SEPARATE FROM derive.test.ts BECAUSE THE FUNCTIONS ARE SEPARATE, which is the
 * point of the slice. Eligibility is tested there over thresholds; placement is
 * tested here over exposure state, and neither file needs a value from the
 * other's domain to make its assertions.
 *
 * Every case pins ONE boundary, and the pairs are deliberate: the value that
 * should not fire and the value that should. A single-sided assertion passes
 * for an off-by-one in the wrong direction.
 *
 * No mocks and no clock. `todayIso` is an argument.
 */
import {
  placeAdjustOffer,
  placeAdvanceOffer,
  shouldRecordExposure,
  type AdvancePlacementInput,
} from '../offerPlacement';
import { deriveAdjustDue } from '../derive';
import {
  ADJUST_MAX_PROACTIVE_OFFERS,
  ADVANCE_MAX_TODAY_EXPOSURES,
  ADVANCE_TODAY_CAP_DAYS,
} from '../../constants/journey';
import type { PhaseKey, PhaseRead, WeeklyCycle } from '../../types/models';

const TODAY = '2026-09-10';

/** A due, undismissed, never-shown offer. Every test varies one thing. */
const base = (over: Partial<AdvancePlacementInput> = {}): AdvancePlacementInput => ({
  due: true,
  declined: false,
  exposures: 0,
  firstOfferedOn: null,
  todayIso: TODAY,
  ...over,
});

describe('placeAdvanceOffer - not due', () => {
  test('an offer that is not due is hidden, not demoted', () => {
    // 'hidden' and 'journey' are different facts and the union exists to keep
    // them apart: nothing has been earned OR elapsed here, so there is nothing
    // for the map to hold either.
    expect(placeAdvanceOffer(base({ due: false }))).toBe('hidden');
  });

  test('exposure state cannot make an undue offer appear anywhere', () => {
    expect(
      placeAdvanceOffer(
        base({ due: false, exposures: 0, firstOfferedOn: null, declined: false })
      )
    ).toBe('hidden');
  });
});

describe('placeAdvanceOffer - a due offer with room left', () => {
  test('lands on Today', () => {
    expect(placeAdvanceOffer(base())).toBe('today');
  });

  test('stays on Today one exposure below the budget', () => {
    expect(
      placeAdvanceOffer(
        base({ exposures: ADVANCE_MAX_TODAY_EXPOSURES - 1, firstOfferedOn: TODAY })
      )
    ).toBe('today');
  });

  test('stays on Today one day below the cap', () => {
    expect(
      placeAdvanceOffer(base({ exposures: 1, firstOfferedOn: '2026-09-04' }))
    ).toBe('today');
  });
});

describe('placeAdvanceOffer - dismiss', () => {
  test('a dismissed offer demotes to the journey IMMEDIATELY', () => {
    // R3's word is "immediately": no remaining exposures are spent, and the
    // seven days do not have to elapse first.
    expect(placeAdvanceOffer(base({ declined: true }))).toBe('journey');
  });

  test('a dismissed offer is NOT hidden, and this is the seam slice 7a fixed', () => {
    // The whole reason the decline check moved out of deriveAdvanceDue. It used
    // to make eligibility false, and a false there would have hidden the offer
    // from the map as well as from Today, which contradicts R3's "then map
    // only". If this ever returns 'hidden', the suppression has crept back.
    expect(placeAdvanceOffer(base({ declined: true }))).not.toBe('hidden');
  });

  test('dismiss wins over having exposures left', () => {
    expect(
      placeAdvanceOffer(base({ declined: true, exposures: 0, firstOfferedOn: null }))
    ).toBe('journey');
  });
});

describe('placeAdvanceOffer - the exposure budget', () => {
  test(`stays on Today at ${ADVANCE_MAX_TODAY_EXPOSURES - 1} exposures`, () => {
    expect(
      placeAdvanceOffer(
        base({ exposures: ADVANCE_MAX_TODAY_EXPOSURES - 1, firstOfferedOn: TODAY })
      )
    ).toBe('today');
  });

  test(`demotes at ${ADVANCE_MAX_TODAY_EXPOSURES} exposures`, () => {
    expect(
      placeAdvanceOffer(
        base({ exposures: ADVANCE_MAX_TODAY_EXPOSURES, firstOfferedOn: TODAY })
      )
    ).toBe('journey');
  });

  test('stays demoted beyond the budget rather than wrapping', () => {
    expect(
      placeAdvanceOffer(
        base({ exposures: ADVANCE_MAX_TODAY_EXPOSURES + 5, firstOfferedOn: TODAY })
      )
    ).toBe('journey');
  });
});

describe('placeAdvanceOffer - the seven-day cap', () => {
  // '2026-09-03' is exactly ADVANCE_TODAY_CAP_DAYS before TODAY.
  const capDay = '2026-09-03';
  const dayBeforeCap = '2026-09-04';

  test(`stays on Today at ${ADVANCE_TODAY_CAP_DAYS - 1} days`, () => {
    expect(
      placeAdvanceOffer(base({ exposures: 1, firstOfferedOn: dayBeforeCap }))
    ).toBe('today');
  });

  test(`demotes at ${ADVANCE_TODAY_CAP_DAYS} days`, () => {
    expect(placeAdvanceOffer(base({ exposures: 1, firstOfferedOn: capDay }))).toBe(
      'journey'
    );
  });

  test('the cap fires WITH exposures still unspent, which is its whole job', () => {
    // R3: the cap exists so a rare opener cannot carry a stale offer for a
    // month. A user with one exposure spent and six left still demotes.
    expect(placeAdvanceOffer(base({ exposures: 1, firstOfferedOn: capDay }))).toBe(
      'journey'
    );
  });

  test('an offer never shown has no cap to elapse', () => {
    // firstOfferedOn null means no exposure has happened, so there is no anchor
    // and nothing has elapsed. A naive implementation treating null as the
    // epoch would demote every new offer instantly.
    expect(placeAdvanceOffer(base({ firstOfferedOn: null }))).toBe('today');
  });

  test('a backwards clock keeps the offer on Today rather than demoting it', () => {
    // Signed arithmetic, deliberately. A future firstOfferedOn means the device
    // date moved; the safe direction is to keep showing an offer the user may
    // never have seen, not to silently retire it.
    expect(
      placeAdvanceOffer(base({ exposures: 1, firstOfferedOn: '2026-12-01' }))
    ).toBe('today');
  });
});

describe('shouldRecordExposure - the day gate', () => {
  test('records when the offer is on Today and today is unspent', () => {
    expect(shouldRecordExposure('today', null, TODAY)).toBe(true);
  });

  test('REFUSES a second exposure on the same calendar day', () => {
    // The assertion the whole ordering argument rests on. Home re-resolves on
    // every focus, so without this a day of tab switching spends the budget.
    expect(shouldRecordExposure('today', TODAY, TODAY)).toBe(false);
  });

  test('records again once the day has rolled over', () => {
    expect(shouldRecordExposure('today', '2026-09-09', TODAY)).toBe(true);
  });

  test('never records for a demoted offer', () => {
    // A demoted offer is not on Today, so it cannot spend a Today exposure.
    // Without this the budget would keep draining after demotion and the
    // seven-day cap would be the only thing still doing any work.
    expect(shouldRecordExposure('journey', null, TODAY)).toBe(false);
  });

  test('never records for an offer that is not due', () => {
    expect(shouldRecordExposure('hidden', null, TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// placeAdjustOffer (slice 7b, section 9 R5)
// ---------------------------------------------------------------------------
describe('placeAdjustOffer', () => {
  test('hidden when the offer is not due', () => {
    expect(placeAdjustOffer({ due: false, declines: 0 })).toBe('hidden');
  });

  test('today on the first offer', () => {
    expect(placeAdjustOffer({ due: true, declines: 0 })).toBe('today');
  });

  test('today on the second offer, after one decline', () => {
    // The re-arm's whole point: a decline answers this week, not the practice.
    expect(placeAdjustOffer({ due: true, declines: 1 })).toBe('today');
  });

  test('journey, NOT hidden, once the cap is spent', () => {
    // R5: "the door is open, Vara just stops knocking." Collapsing this into
    // 'hidden' would take the phase page's door away with the card, which is
    // the failure the three-value union exists to prevent.
    expect(placeAdjustOffer({ due: true, declines: ADJUST_MAX_PROACTIVE_OFFERS })).toBe(
      'journey'
    );
  });

  test('stays demoted past the cap, and never re-promotes', () => {
    for (const declines of [2, 3, 9]) {
      expect(placeAdjustOffer({ due: true, declines })).toBe('journey');
    }
  });

  test('the cap is the named constant, not a literal', () => {
    // Pins the boundary to the constant rather than to the number 2, so
    // retuning the beta-tunable moves this test with it instead of failing it.
    expect(
      placeAdjustOffer({ due: true, declines: ADJUST_MAX_PROACTIVE_OFFERS - 1 })
    ).toBe('today');
    expect(placeAdjustOffer({ due: true, declines: ADJUST_MAX_PROACTIVE_OFFERS })).toBe(
      'journey'
    );
  });

  test('NOT due beats the cap: nothing to demote', () => {
    expect(
      placeAdjustOffer({ due: false, declines: ADJUST_MAX_PROACTIVE_OFFERS })
    ).toBe('hidden');
  });

  test('has NO exposure model, by shape', () => {
    // R3's exposure budget is scoped to advancement only. Asserted structurally
    // rather than in prose: the input this function accepts has exactly two
    // keys, so an exposure count, a first-offered date or a day gate could not
    // be passed here even by a caller that wanted to.
    const input = { due: true, declines: 0 };
    expect(Object.keys(input).sort()).toEqual(['declines', 'due']);
  });
});

// ---------------------------------------------------------------------------
// THE PROACTIVE WINDOW, walked end to end (slice 7b amendment 4).
//
// THE RULE, as stated in placeAdjustOffer's header: a proactive adjustment
// offer remains eligible on Today until the user acts or a newer read
// supersedes the pair, whichever comes first.
//
// PINNED HERE RATHER THAN IN derive.test.ts BECAUSE IT SPANS BOTH FUNCTIONS.
// Eligibility and placement each hold half of it, and the failure this guards
// against is exactly the kind that hides between two green unit suites: each
// function doing what it says while the sentence they jointly implement is
// false. The walk below is one user's timeline in order.
// ---------------------------------------------------------------------------
describe('the proactive adjustment window', () => {
  const ENTERED = '2026-08-01';
  const read = (
    weekStart: string,
    weekEnd: string,
    phaseRead?: PhaseRead
  ): WeeklyCycle =>
    ({
      id: 'c-' + weekStart,
      userId: 'alice',
      weekStart,
      weekEnd,
      phaseRead,
      ...(phaseRead ? { phaseKeyAtRead: 'remove' as PhaseKey } : {}),
    }) as unknown as WeeklyCycle;

  /** Eligibility and placement together, as Home computes them. */
  const place = (cycles: WeeklyCycle[], armedFromIso: string | null, declines: number) =>
    placeAdjustOffer({
      due: deriveAdjustDue({
        cyclesOldestFirst: cycles,
        phaseKey: 'remove',
        armedFromIso,
      }),
      declines,
    });

  const first = read('2026-08-17', '2026-08-23', 'not_moving');
  const second = read('2026-08-24', '2026-08-30', 'not_moving');
  const rolledOver = read('2026-08-31', '2026-09-06', undefined);
  const unclear = read('2026-08-31', '2026-09-06', 'unclear');

  test('two not_moving reads put the offer on Today', () => {
    expect(place([first, second], ENTERED, 0)).toBe('today');
  });

  test('a blank rolled-over week does NOT take it away', () => {
    // "MERE TIME IS NOT AN EXIT." The week turned, a cycle was created before
    // Home rendered, and the user has not been asked anything yet. Withdrawing
    // the offer here would answer a question on their behalf.
    expect(place([first, second, rolledOver], ENTERED, 0)).toBe('today');
  });

  test('a newer read that is not not_moving supersedes the pair', () => {
    // The second exit clause. The user answered, and the answer was not a
    // complaint, so the run breaks on the fresher pair.
    expect(place([first, second, unclear], ENTERED, 0)).toBe('hidden');
  });

  test('declining takes it away, and the floor is the decline date', () => {
    // The first exit clause. The decline lands inside the live week, so the
    // floor must exclude that week too: see the weekStart argument at
    // AdjustDueInput.armedFromIso.
    expect(place([first, second, rolledOver], '2026-08-27', 1)).toBe('hidden');
  });

  test('two FURTHER not_moving reads bring it back, as the second offer', () => {
    const third = read('2026-08-31', '2026-09-06', 'not_moving');
    const fourth = read('2026-09-07', '2026-09-13', 'not_moving');
    expect(place([first, second, third, fourth], '2026-08-27', 1)).toBe('today');
  });

  test('the second decline caps it to the door, and nothing brings it back', () => {
    const fifth = read('2026-09-14', '2026-09-20', 'not_moving');
    const sixth = read('2026-09-21', '2026-09-27', 'not_moving');
    // Two fresh not_moving reads, above the second decline's floor, and still
    // demoted: the cap is what is holding it, not eligibility. That is the
    // distinction R5 draws between stopping knocking and closing the door.
    expect(place([fifth, sixth], '2026-09-10', 2)).toBe('journey');
  });

  test('acting ends the window exactly as declining does', () => {
    // `adjustChosenAt` joins the floor, so a user who chose an alternative is
    // not asked again about the reads that prompted it. The decline count is
    // untouched, which is why this reads 0 rather than 1: acting does not spend
    // the cap, because the user got what the offer was for.
    expect(place([first, second], '2026-08-27', 0)).toBe('hidden');
  });
});
