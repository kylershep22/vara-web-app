import {
  completionAcknowledgment,
  timeOfDay,
} from '../completionAcknowledgment';

describe('completionAcknowledgment', () => {
  it('names the practice without a time when no completedAt is given', () => {
    expect(completionAcknowledgment('Extended Exhale')).toBe(
      'Extended Exhale, done.'
    );
    expect(completionAcknowledgment('Extended Exhale', null)).toBe(
      'Extended Exhale, done.'
    );
  });

  it('adds the time of day when a completion time is available', () => {
    expect(
      completionAcknowledgment('Box Breathing', new Date(2026, 6, 20, 8, 0, 0))
    ).toBe('Box Breathing, done this morning.');
    expect(
      completionAcknowledgment('Box Breathing', new Date(2026, 6, 20, 14, 0, 0))
    ).toBe('Box Breathing, done this afternoon.');
    expect(
      completionAcknowledgment('Box Breathing', new Date(2026, 6, 20, 21, 0, 0))
    ).toBe('Box Breathing, done this evening.');
  });
});

describe('timeOfDay', () => {
  it('buckets on the hour boundaries: <12 morning, <17 afternoon, else evening', () => {
    expect(timeOfDay(new Date(2026, 6, 20, 0, 0))).toBe('morning');
    expect(timeOfDay(new Date(2026, 6, 20, 11, 59))).toBe('morning');
    expect(timeOfDay(new Date(2026, 6, 20, 12, 0))).toBe('afternoon');
    expect(timeOfDay(new Date(2026, 6, 20, 16, 59))).toBe('afternoon');
    expect(timeOfDay(new Date(2026, 6, 20, 17, 0))).toBe('evening');
    expect(timeOfDay(new Date(2026, 6, 20, 23, 59))).toBe('evening');
  });
});
