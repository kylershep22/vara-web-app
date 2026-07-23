// habitHistory — the detail screen's history logic, and the guardrails on it.
//
// The guardrail tests are the point. Every number this module produces has to
// survive one question: CAN IT BE FAILED? A cumulative total cannot. A streak,
// a percentage, a fraction against a target, or a completion rate can — and
// none of them are produced here. The other half is omission: a habit too new
// for a line gets NO line, never a zero and never a placeholder.

import {
  HISTORY_WEEKS,
  completionUnit,
  describeStretch,
  formatDayMonth,
  pastWeeks,
  qualitativeNoticing,
  reportingLines,
  scheduleLabel,
  sinceLabel,
  timeOfDayLabel,
  toDateSafe,
  weekdayNames,
} from '../habitHistory';
import { localDateKey } from '../../dashboard/habitWeekState';

// Thursday 16 July 2026. Sunday-start week: Sun 12 … Sat 18.
const TODAY = new Date(2026, 6, 16, 9, 0, 0);
const SUNDAY_START = 0;

/** `count` consecutive date keys starting at `origin`. */
function keysFrom(origin: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(origin);
    d.setDate(d.getDate() + i);
    return localDateKey(d);
  });
}

/** `perWeek` completions in each of `weeks` consecutive weeks from `start`. */
function keysPerWeek(start: Date, weeks: number, perWeek: number): string[] {
  const keys: string[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < perWeek; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + w * 7 + d);
      keys.push(localDateKey(date));
    }
  }
  return keys;
}

describe('pastWeeks — permanently bounded at four weeks', () => {
  it('is fixed at four rows', () => {
    expect(HISTORY_WEEKS).toBe(4);
    expect(pastWeeks(TODAY, SUNDAY_START)).toHaveLength(4);
  });

  it('takes no habit and no age, so nothing can make it grow', () => {
    // The signature is the guarantee: there is no habit, no start date, and no
    // completion history to widen the window. A two-year-old habit and a
    // five-week-old one produce the identical four rows.
    expect(pastWeeks(TODAY, SUNDAY_START)).toEqual(pastWeeks(TODAY, SUNDAY_START));
    expect(pastWeeks(TODAY, SUNDAY_START).flatMap((w) => w.dateKeys)).toHaveLength(28);
  });

  it('labels the rows oldest first, ending at "Last week"', () => {
    expect(pastWeeks(TODAY, SUNDAY_START).map((w) => w.label)).toEqual([
      '4 wks ago',
      '3 wks ago',
      '2 wks ago',
      'Last week',
    ]);
  });

  it('excludes the current week entirely', () => {
    const keys = pastWeeks(TODAY, SUNDAY_START).flatMap((w) => w.dateKeys);
    // The current Sunday-start week begins 2026-07-12.
    expect(keys).not.toContain('2026-07-12');
    expect(keys).not.toContain('2026-07-16');
    expect(keys[keys.length - 1]).toBe('2026-07-11'); // the Saturday before
    expect(keys[0]).toBe('2026-06-14'); // four weeks before that week's start
  });

  it('orders each row in the same column order as the week strip', () => {
    const [oldest] = pastWeeks(TODAY, SUNDAY_START);
    expect(oldest.dateKeys).toEqual(keysFrom(new Date(2026, 5, 14), 7));
    expect(weekdayNames(SUNDAY_START)[0]).toBe('Sunday');
    expect(weekdayNames(1)[0]).toBe('Monday');
  });
});

describe('metadata labels', () => {
  it('names each schedule shape', () => {
    expect(scheduleLabel({ frequencyType: 'daily' })).toBe('Every day');
    expect(scheduleLabel({ frequencyType: 'flexible' })).toBe('Flexible');
    expect(
      scheduleLabel({ frequencyType: 'specific_days', specificDays: [5, 1, 3] })
    ).toBe('Mon · Wed · Fri');
  });

  it('omits the schedule for a legacy habit rather than guessing one', () => {
    // No frequencyType: the wizard wrote type + frequency only. Stating a
    // schedule we do not know is the same lie as painting false gaps.
    expect(scheduleLabel({})).toBeNull();
    expect(scheduleLabel({ frequencyType: 'specific_days', specificDays: [] })).toBeNull();
  });

  it('treats "anytime" as no time of day', () => {
    expect(timeOfDayLabel({ timeOfDay: 'evening' })).toBe('Evening');
    expect(timeOfDayLabel({ timeOfDay: 'anytime' })).toBeNull();
    expect(timeOfDayLabel({})).toBeNull();
  });

  it('formats the start date without a year, or omits it', () => {
    expect(sinceLabel(new Date(2026, 6, 12))).toBe('Since 12 July');
    expect(sinceLabel(null)).toBeNull();
  });

  it('reads a Firestore Timestamp, a Date, or nothing', () => {
    const asDate = new Date(2026, 6, 12);
    expect(toDateSafe({ toDate: () => asDate })).toEqual(asDate);
    expect(toDateSafe(asDate)).toEqual(asDate);
    expect(toDateSafe(undefined)).toBeNull();
    expect(toDateSafe({})).toBeNull();
  });
});

describe('qualitativeNoticing', () => {
  it('echoes the slot the user set, with no number in it', () => {
    const line = qualitativeNoticing({ timeOfDay: 'evening' });
    expect(line).toBe('Evenings are usually when you reach for this.');
    expect(line).not.toMatch(/\d/);
  });

  it('says nothing when the user declared no slot', () => {
    expect(qualitativeNoticing({ timeOfDay: 'anytime' })).toBeNull();
    expect(qualitativeNoticing({})).toBeNull();
  });
});

describe('completionUnit', () => {
  it('uses the habit own unit when the user declared one', () => {
    expect(completionUnit({ timeOfDay: 'evening' }, 28)).toBe('evenings');
    expect(completionUnit({ timeOfDay: 'morning' }, 1)).toBe('morning');
  });

  it('falls back to a neutral unit rather than guessing from the name', () => {
    expect(completionUnit({}, 4)).toBe('completions');
    expect(completionUnit({ timeOfDay: 'anytime' }, 1)).toBe('completion');
  });
});

describe('describeStretch', () => {
  it('names a fortnight the way a person would', () => {
    expect(describeStretch(new Date(2026, 5, 1), new Date(2026, 5, 14))).toBe(
      'the first two weeks of June'
    );
    expect(describeStretch(new Date(2026, 5, 17), new Date(2026, 5, 30))).toBe(
      'the last two weeks of June'
    );
    expect(describeStretch(new Date(2026, 5, 8), new Date(2026, 5, 21))).toBe(
      '8–21 June'
    );
    expect(describeStretch(new Date(2026, 5, 28), new Date(2026, 6, 11))).toBe(
      '28 June to 11 July'
    );
  });

  it('never uses an em dash', () => {
    const emDash = String.fromCharCode(0x2014);
    expect(describeStretch(new Date(2026, 5, 8), new Date(2026, 5, 21))).not.toContain(
      emDash
    );
  });
});

describe('reportingLines — what is said', () => {
  it('reports a cumulative total in the habit own unit', () => {
    const start = new Date(2026, 5, 1);
    const [total] = reportingLines({
      habit: { timeOfDay: 'evening' },
      completionDateKeys: keysFrom(start, 28),
      startDate: start,
      today: TODAY,
    });

    expect(total.id).toBe('total');
    expect(total.emphasis).toBe('28 evenings');
    expect(total.rest).toBe(' since 1 June.');
  });

  it('describes the typical week in words, against no target', () => {
    const start = new Date(2026, 3, 1); // ~15 complete weeks before TODAY
    const lines = reportingLines({
      habit: {},
      completionDateKeys: keysPerWeek(start, 15, 5),
      startDate: start,
      today: TODAY,
    });

    const typical = lines.find((l) => l.id === 'typical');
    expect(typical).toEqual({
      id: 'typical',
      emphasis: 'Most weeks',
      rest: ' land around five.',
    });
  });

  it('names a steadiest stretch without implying a target to hold', () => {
    const start = new Date(2026, 4, 1);
    const lines = reportingLines({
      habit: {},
      // A dense fortnight in mid-June, and almost nothing either side.
      completionDateKeys: [
        ...keysFrom(new Date(2026, 4, 2), 2),
        ...keysFrom(new Date(2026, 5, 8), 14),
        ...keysFrom(new Date(2026, 6, 2), 1),
      ],
      startDate: start,
      today: TODAY,
    });

    const steadiest = lines.find((l) => l.id === 'steadiest');
    expect(steadiest?.emphasis).toBe('Steadiest');
    expect(steadiest?.rest).toBe(' was 8–21 June.');
  });
});

describe('reportingLines — what is omitted', () => {
  it('gives a brand-new habit no lines at all, not zeros', () => {
    expect(
      reportingLines({
        habit: {},
        completionDateKeys: [],
        startDate: TODAY,
        today: TODAY,
      })
    ).toEqual([]);
  });

  it('reports only the total before there is a typical week or a stretch', () => {
    const start = new Date(2026, 6, 14); // two days old
    const lines = reportingLines({
      habit: {},
      completionDateKeys: [localDateKey(start)],
      startDate: start,
      today: TODAY,
    });

    expect(lines.map((l) => l.id)).toEqual(['total']);
  });

  it('omits the typical line rather than saying most weeks land around zero', () => {
    const start = new Date(2026, 3, 1);
    const lines = reportingLines({
      habit: {},
      completionDateKeys: keysFrom(start, 2), // two completions in fifteen weeks
      startDate: start,
      today: TODAY,
    });

    expect(lines.find((l) => l.id === 'typical')).toBeUndefined();
    expect(lines.map((l) => l.emphasis + l.rest).join(' ')).not.toMatch(/zero/i);
  });

  it('omits the steadiest line when no fortnight is worth naming', () => {
    const start = new Date(2026, 3, 1);
    const lines = reportingLines({
      habit: {},
      completionDateKeys: [localDateKey(start), localDateKey(new Date(2026, 5, 20))],
      startDate: start,
      today: TODAY,
    });

    expect(lines.find((l) => l.id === 'steadiest')).toBeUndefined();
  });

  it('says nothing at all when the habit has no usable start date', () => {
    expect(
      reportingLines({
        habit: {},
        completionDateKeys: keysFrom(new Date(2026, 5, 1), 10),
        startDate: null,
        today: TODAY,
      })
    ).toEqual([]);
  });
});

describe('reportingLines — guardrails', () => {
  const start = new Date(2026, 2, 1);
  const everyLine = reportingLines({
    habit: { timeOfDay: 'morning' },
    completionDateKeys: keysPerWeek(start, 19, 5),
    startDate: start,
    today: TODAY,
  })
    .map((l) => l.emphasis + l.rest)
    .join(' ');

  it('produces all three lines for a long-running habit', () => {
    expect(everyLine).toContain('mornings');
    expect(everyLine).toContain('Most weeks');
    expect(everyLine).toContain('Steadiest');
  });

  it.each([
    ['a streak', /streak/i],
    ['a percentage', /%|percent/i],
    ['a fraction against a target', /\b\d+\s*(of|\/)\s*\d+\b/],
    ['a completion rate', /\brate\b/i],
    ['an assigned state', /great job|well done|amazing|you're crushing|keep it up/i],
    ['a target to hit', /\bgoal\b|\btarget\b|\bon track\b|\bbehind\b/i],
  ])('never reports %s', (_label, pattern) => {
    expect(everyLine).not.toMatch(pattern);
  });

  it('formats a date the same way everywhere', () => {
    expect(formatDayMonth(new Date(2026, 6, 12))).toBe('12 July');
  });
});
