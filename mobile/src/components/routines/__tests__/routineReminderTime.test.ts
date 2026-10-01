/**
 * routineReminderTime: the picker-era helpers (ROUTINE-REMINDER-TIME-PICKER,
 * Kyle's rulings R-4, R-6 and R-7, 2026-10-01). Pure functions, driven
 * directly; parseTimeString runs for real.
 */
jest.mock('expo-notifications', () => ({}));
jest.mock('../../../config/firebase', () => ({ db: null }));

import {
  nextQuarterHourAfter,
  initialPickerTime,
  displayReminderTime,
  reminderModelFrom,
} from '../routineReminderTime';

function at(hour: number, minute: number, second = 0): Date {
  const d = new Date(2026, 9, 1);
  d.setHours(hour, minute, second, 0);
  return d;
}

describe('nextQuarterHourAfter (R-4)', () => {
  // Mutations caught: >= instead of strictly after (2:15 stays 2:15, 12:00 PM
  // stays 12:00 PM); dropping the wrap at midnight (11:45 PM gives hour 24).
  test.each([
    ['2:07 PM', at(14, 7), { hour: 14, minute: 15 }],
    ['2:15 PM exactly', at(14, 15), { hour: 14, minute: 30 }],
    ['11:45 PM', at(23, 45), { hour: 0, minute: 0 }],
    ['11:50 PM', at(23, 50), { hour: 0, minute: 0 }],
    ['11:59 PM', at(23, 59), { hour: 0, minute: 0 }],
    ['12:00 PM', at(12, 0), { hour: 12, minute: 15 }],
  ])('%s opens at the next quarter hour strictly after', (_label, now, expected) => {
    expect(nextQuarterHourAfter(now)).toEqual(expected);
  });

  test('seconds are ignored: 2:15:40 PM still opens at 2:30 PM', () => {
    expect(nextQuarterHourAfter(at(14, 15, 40))).toEqual({ hour: 14, minute: 30 });
  });
});

describe('initialPickerTime (R-4)', () => {
  test('a valid stored value wins over the clock', () => {
    // Mutation caught: always opening at the next quarter hour.
    expect(initialPickerTime('7:30 PM', at(14, 7))).toEqual({ hour: 19, minute: 30 });
    expect(initialPickerTime('08:00', at(14, 7))).toEqual({ hour: 8, minute: 0 });
  });

  test.each([[null], [undefined], [''], ['730'], ['7.30 pm']])(
    '%p falls through to the next quarter hour',
    (value) => {
      // Mutation caught: seeding from a routine-type default or 0:00.
      expect(initialPickerTime(value, at(14, 7))).toEqual({ hour: 14, minute: 15 });
    }
  );
});

describe('displayReminderTime (R-7)', () => {
  test('a parseable stored value displays in the picker-era format', () => {
    // Mutation caught: displaying the raw stored text.
    expect(displayReminderTime('08:00')).toBe('8:00 AM');
    expect(displayReminderTime('19:05')).toBe('7:05 PM');
    expect(displayReminderTime('7:30 PM')).toBe('7:30 PM');
  });

  test('an unparseable or absent value is never displayed as a time', () => {
    // Mutation caught: falling back to the raw text when parsing fails.
    expect(displayReminderTime('730')).toBeNull();
    expect(displayReminderTime(null)).toBeNull();
    expect(displayReminderTime(undefined)).toBeNull();
  });
});

describe('reminderModelFrom (R-6)', () => {
  test('a valid stored value is kept as stored, not reformatted', () => {
    // Mutation caught: rewriting storage for formatting on the next save.
    expect(reminderModelFrom('08:00')).toBe('08:00');
    expect(reminderModelFrom('7:30 PM')).toBe('7:30 PM');
  });

  test('a legacy malformed value is null in the model', () => {
    // Mutation caught: carrying the malformed text into the model.
    expect(reminderModelFrom('730')).toBeNull();
    expect(reminderModelFrom(null)).toBeNull();
  });
});
