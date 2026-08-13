// dayShape — the strip's geometry (TB-1b).
//
// Pure math, no rendering. The strip is presentational and untouchable, so the
// only thing that can be wrong about it is where things land; this is that.

import {
  DAY_SHAPE_ZONES,
  STRIP_START_HOUR,
  STRIP_END_HOUR,
  MIN_PILL_WIDTH_PCT,
  hourToPercent,
  blockPill,
  rhythmBands,
} from '../dayShape';

/** A Date at h:m on a fixed day. The date part is never asserted on. */
const at = (h: number, m = 0) => new Date(2026, 7, 13, h, m, 0);

describe('the span and its zones', () => {
  it('spans 06:00 to 22:00', () => {
    expect(STRIP_START_HOUR).toBe(6);
    expect(STRIP_END_HOUR).toBe(22);
  });

  it('is three zones covering the span end to end with no gaps', () => {
    expect(DAY_SHAPE_ZONES).toHaveLength(3);
    expect(DAY_SHAPE_ZONES[0].startHour).toBe(STRIP_START_HOUR);
    expect(DAY_SHAPE_ZONES[2].endHour).toBe(STRIP_END_HOUR);
    // Each zone begins exactly where the previous one ended.
    expect(DAY_SHAPE_ZONES[1].startHour).toBe(DAY_SHAPE_ZONES[0].endHour);
    expect(DAY_SHAPE_ZONES[2].startHour).toBe(DAY_SHAPE_ZONES[1].endHour);
  });
});

describe('hourToPercent — equal visual thirds, piecewise within each zone', () => {
  it('puts the span edges at 0 and 100', () => {
    expect(hourToPercent(6)).toBe(0);
    expect(hourToPercent(22)).toBe(100);
  });

  it('puts the zone boundaries on exact thirds, not on hour proportions', () => {
    // 12:00 and 17:00 are the dividers. A linear 06-22 mapping would put them
    // at 37.5 and 68.75; the mockup draws them at a third and two thirds, and
    // the zones are equal-WIDTH rather than equal-LENGTH.
    expect(hourToPercent(12)).toBeCloseTo(100 / 3, 5);
    expect(hourToPercent(17)).toBeCloseTo(200 / 3, 5);
  });

  it('interpolates inside a zone', () => {
    // 09:00 is halfway through morning (06-12), so half of the first third.
    expect(hourToPercent(9)).toBeCloseTo(100 / 6, 5);
    // 14:00 is two fifths through afternoon (12-17).
    expect(hourToPercent(14)).toBeCloseTo(100 / 3 + 0.4 * (100 / 3), 5);
  });

  it('returns null outside the span', () => {
    expect(hourToPercent(5.99)).toBeNull();
    expect(hourToPercent(22.01)).toBeNull();
    expect(hourToPercent(0)).toBeNull();
  });
});

describe('blockPill', () => {
  it('positions and sizes a block inside the span', () => {
    // 09:00 for 90 minutes → 09:00 to 10:30, both inside morning.
    const pill = blockPill(at(9), 90);

    expect(pill).not.toBeNull();
    expect(pill!.leftPercent).toBeCloseTo(hourToPercent(9)!, 5);
    expect(pill!.widthPercent).toBeCloseTo(hourToPercent(10.5)! - hourToPercent(9)!, 5);
  });

  it('spans zones when a block crosses a divider', () => {
    // 11:00 for 120 minutes crosses the morning/afternoon boundary.
    const pill = blockPill(at(11), 120);

    expect(pill!.leftPercent).toBeCloseTo(hourToPercent(11)!, 5);
    expect(pill!.leftPercent + pill!.widthPercent).toBeCloseTo(hourToPercent(13)!, 5);
  });

  it('gives a short block a legibility floor rather than a hairline', () => {
    // 30 minutes of a five-hour zone is ~3.3% of a third — too thin to read.
    const pill = blockPill(at(14), 30);

    expect(pill!.widthPercent).toBeGreaterThanOrEqual(MIN_PILL_WIDTH_PCT);
  });

  it('never lets the floor push a pill past the end of the track', () => {
    const pill = blockPill(at(21, 45), 15);

    expect(pill!.leftPercent + pill!.widthPercent).toBeLessThanOrEqual(100.0001);
  });

  it('excludes a block that starts before the span', () => {
    // In the card list, off the strip. No clamping.
    expect(blockPill(at(5), 60)).toBeNull();
  });

  it('excludes a block that starts after the span', () => {
    expect(blockPill(at(23), 30)).toBeNull();
  });

  it('excludes a block that starts inside but runs past the end', () => {
    // Truncating the pill would misreport the duration, and clamping is
    // exactly the artifact the strip must not produce. Card list only.
    expect(blockPill(at(21, 30), 90)).toBeNull();
  });

  it('includes a block that ends exactly at the span edge', () => {
    expect(blockPill(at(21), 60)).not.toBeNull();
  });
});

describe('rhythmBands', () => {
  it('returns nothing when the user has no rhythms', () => {
    expect(rhythmBands([])).toEqual([]);
  });

  it("ignores 'varies', which maps to no clock range", () => {
    expect(rhythmBands(['varies'])).toEqual([]);
  });

  it('maps a fully-contained window onto the strip', () => {
    // mid_morning is 09-11, comfortably inside the span.
    const bands = rhythmBands(['mid_morning']);

    expect(bands).toHaveLength(1);
    expect(bands[0].leftPercent).toBeCloseTo(hourToPercent(9)!, 5);
    expect(bands[0].leftPercent + bands[0].widthPercent).toBeCloseTo(
      hourToPercent(11)!,
      5
    );
  });

  it('CLIPS a window that overhangs the span, rather than dropping it', () => {
    // early_morning is 05-08; only 06-08 is on the strip. A band is a region,
    // so clipping it is honest — unlike truncating a block pill, which would
    // misreport a duration. The two rules differ deliberately.
    const bands = rhythmBands(['early_morning']);

    expect(bands).toHaveLength(1);
    expect(bands[0].leftPercent).toBe(0);
    expect(bands[0].leftPercent + bands[0].widthPercent).toBeCloseTo(
      hourToPercent(8)!,
      5
    );
  });

  it('drops late_night entirely, which falls wholly outside the span', () => {
    // 22-01 wraps midnight and the strip stops at 22:00.
    expect(rhythmBands(['late_night'])).toEqual([]);
  });

  it('shades multiple spans when several windows are selected', () => {
    const bands = rhythmBands(['mid_morning', 'evening']);

    expect(bands).toHaveLength(2);
    expect(bands.map((b) => b.key)).toEqual(['mid_morning', 'evening']);
  });

  it('reads windows in canonical day order, never tap order', () => {
    const bands = rhythmBands(['evening', 'mid_morning']);

    expect(bands.map((b) => b.key)).toEqual(['mid_morning', 'evening']);
  });

  it('ignores keys it does not recognise', () => {
    expect(rhythmBands(['not_a_zone'])).toEqual([]);
  });
});
