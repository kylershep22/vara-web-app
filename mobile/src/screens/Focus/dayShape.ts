// dayShape — the geometry of the day-shape strip (TB-1b, mockup A2).
//
// Pure math, deliberately separate from the component that draws it. The strip
// is PRESENTATIONAL ONLY — no touch handling, no drag, no hour ticks — so the
// only thing that can be wrong about it is where things land. Keeping the
// arithmetic here makes that directly testable without rendering anything.
//
// WHAT THE MOCKUP LEAVES IMPLICIT, resolved here once:
//
// EQUAL VISUAL THIRDS, NOT A LINEAR CLOCK. The mockup draws its zone dividers at
// 33.3% and 66.6% (A2's .zdiv elements), so the three zones are equal in WIDTH
// while covering unequal spans of time (6h / 5h / 5h). Mapping is therefore
// piecewise: linear inside each zone, with the zone boundaries pinned to exact
// thirds. A single linear 06:00-22:00 mapping would put the dividers at 37.5%
// and 68.75% and contradict the drawing.
//
// THE KNOWN COST of that choice: a 30-minute block in the morning zone (6h wide)
// renders slightly narrower than a 30-minute block in the afternoon zone (5h
// wide) — a 20% distortion. It is small, it is deliberate, and a test pins it.
// If duration comparability across zones ever matters more than matching the
// drawn dividers, that is the trade to revisit.
//
// PILLS ARE NEVER CLAMPED, BANDS ARE ALWAYS CLIPPED. A block pill represents an
// object with a duration, so truncating it would misreport that duration —
// blocks that do not fit entirely are simply absent from the strip and live in
// the card list instead. A rhythm band represents a region, so clipping it to
// the visible span is honest. The two rules differ on purpose.

import {
  FOCUS_RHYTHM_HOURS,
  TIMED_RHYTHM_KEYS_IN_ORDER,
  type TimedRhythmKey,
} from '../../constants/focusRhythms';

/** The strip's visible span. Nothing outside it is drawn. */
export const STRIP_START_HOUR = 6;
export const STRIP_END_HOUR = 22;

/**
 * Smallest width a block pill may render at, as a percentage of the track.
 *
 * A 30-minute block is ~3.3% of a five-hour zone's third, which reads as a
 * hairline. The mockup applies its own floor (A2's second pill is 7% for a
 * 30-minute block), so this is matching the drawing, not inventing a rule.
 */
export const MIN_PILL_WIDTH_PCT = 6;

export interface DayShapeZone {
  key: 'morning' | 'afternoon' | 'evening';
  /** Uppercase strip label. Not user-facing prose; see blocksCopy for that. */
  label: string;
  startHour: number;
  endHour: number;
}

/**
 * The three zones, in order, covering the span end to end with no gaps.
 *
 * These are the STRIP's zones and are unrelated to the rhythm zones in
 * constants/focusRhythms — those are the user's self-reported windows and have
 * their own, finer-grained hour ranges. Do not unify them.
 */
export const DAY_SHAPE_ZONES: DayShapeZone[] = [
  { key: 'morning', label: 'MORNING', startHour: 6, endHour: 12 },
  { key: 'afternoon', label: 'AFTERNOON', startHour: 12, endHour: 17 },
  { key: 'evening', label: 'EVENING', startHour: 17, endHour: 22 },
];

const ZONE_WIDTH_PCT = 100 / DAY_SHAPE_ZONES.length;

/**
 * Where an hour sits on the track, as a percentage, or null when it falls
 * outside the visible span.
 *
 * Accepts fractional hours (9.5 = 09:30). At an exact zone boundary the later
 * zone wins, which is consistent because both readings give the same percentage.
 */
export function hourToPercent(hour: number): number | null {
  if (hour < STRIP_START_HOUR || hour > STRIP_END_HOUR) return null;
  if (hour === STRIP_END_HOUR) return 100;

  const index = DAY_SHAPE_ZONES.findIndex(
    (z) => hour >= z.startHour && hour < z.endHour
  );
  if (index === -1) return null;

  const zone = DAY_SHAPE_ZONES[index];
  const withinZone = (hour - zone.startHour) / (zone.endHour - zone.startHour);
  return index * ZONE_WIDTH_PCT + withinZone * ZONE_WIDTH_PCT;
}

/** A positioned bar on the track, in track-relative percentages. */
export interface StripSegment {
  leftPercent: number;
  widthPercent: number;
}

export interface RhythmBand extends StripSegment {
  key: TimedRhythmKey;
}

/** Fractional hour of a Date, in local time. */
function fractionalHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Where a block's pill sits, or null when the block does not belong on the
 * strip at all.
 *
 * Null covers three cases, all of which mean "card list only, no error, no
 * artifact": starts before the span, starts after it, or starts inside but runs
 * past the end. See the header on why a partial block is excluded rather than
 * truncated.
 */
export function blockPill(startAt: Date, durationMinutes: number): StripSegment | null {
  const startHour = fractionalHour(startAt);
  const endHour = startHour + durationMinutes / 60;

  if (startHour < STRIP_START_HOUR) return null;
  if (endHour > STRIP_END_HOUR) return null;

  const left = hourToPercent(startHour);
  const right = hourToPercent(endHour);
  if (left === null || right === null) return null;

  // Floor for legibility, then hold the pill inside the track so the floor can
  // never push its trailing edge past the end.
  const width = Math.max(right - left, MIN_PILL_WIDTH_PCT);
  return { leftPercent: Math.min(left, 100 - width), widthPercent: width };
}

/**
 * The shaded stretches for the user's stored rhythm windows.
 *
 * Read in canonical day order from the TIMED_RHYTHM_KEYS_IN_ORDER constants
 * export — never tap order, and never rhythmRecall's local duplicate — so the
 * strip can never contradict the summary the Focus hub already showed.
 *
 * Windows are clipped to the visible span. `varies`, unknown keys, and
 * late_night (22-01, wholly outside the span) all produce no band.
 */
export function rhythmBands(windows: string[]): RhythmBand[] {
  const bands: RhythmBand[] = [];

  for (const key of TIMED_RHYTHM_KEYS_IN_ORDER) {
    if (!windows.includes(key)) continue;

    const { startHour, endHour } = FOCUS_RHYTHM_HOURS[key];
    // A wrapped range (late night) has start > end and cannot intersect the
    // daytime span, so it is skipped rather than reasoned about.
    if (startHour > endHour) continue;

    const clippedStart = Math.max(startHour, STRIP_START_HOUR);
    const clippedEnd = Math.min(endHour, STRIP_END_HOUR);
    if (clippedEnd <= clippedStart) continue;

    const left = hourToPercent(clippedStart);
    const right = hourToPercent(clippedEnd);
    if (left === null || right === null) continue;

    bands.push({ key, leftPercent: left, widthPercent: right - left });
  }

  return bands;
}
