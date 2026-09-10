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
  placeAdvanceOffer,
  shouldRecordExposure,
  type AdvancePlacementInput,
} from '../offerPlacement';
import {
  ADVANCE_MAX_TODAY_EXPOSURES,
  ADVANCE_TODAY_CAP_DAYS,
} from '../../constants/journey';

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
