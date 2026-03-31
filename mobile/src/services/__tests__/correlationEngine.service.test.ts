import {
  computeCorrelations,
  type DailyDataPoint,
  type WeeklyCorrelations,
} from '../correlationEngine.service';

function makeDay(overrides: Partial<DailyDataPoint> = {}): DailyDataPoint {
  return {
    date: '2026-03-20',
    sleepQuality: null,
    mood: null,
    energy: null,
    stress: null,
    habitCompletionRate: null,
    focusMinutes: null,
    journaled: false,
    ...overrides,
  };
}

describe('computeCorrelations', () => {
  it('returns null when fewer than 5 days have mood or sleep data', () => {
    const data = [
      makeDay({ date: '2026-03-20', mood: 4 }),
      makeDay({ date: '2026-03-21', mood: 3 }),
      makeDay({ date: '2026-03-22' }),
      makeDay({ date: '2026-03-23' }),
    ];
    expect(computeCorrelations(data)).toBeNull();
  });

  it('returns correlations when 5+ days have data', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 4, mood: 4, habitCompletionRate: 90, journaled: true }),
      makeDay({ date: '2026-03-17', sleepQuality: 2, mood: 2, habitCompletionRate: 40, journaled: false }),
      makeDay({ date: '2026-03-18', sleepQuality: 5, mood: 4, habitCompletionRate: 100, journaled: true }),
      makeDay({ date: '2026-03-19', sleepQuality: 1, mood: 2, habitCompletionRate: 30, journaled: false }),
      makeDay({ date: '2026-03-20', sleepQuality: 4, mood: 4, habitCompletionRate: 85, journaled: true }),
    ];
    const result = computeCorrelations(data);
    expect(result).not.toBeNull();
    expect(result!.sleepHabitCorrelation).toBeDefined();
    expect(result!.topDriver).toBeDefined();
    expect(result!.bestDay).toBeDefined();
    expect(result!.hardestDay).toBeDefined();
  });

  it('computes sleep-habit correlation correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 5, habitCompletionRate: 100 }),
      makeDay({ date: '2026-03-17', sleepQuality: 4, habitCompletionRate: 80 }),
      makeDay({ date: '2026-03-18', sleepQuality: 1, habitCompletionRate: 20 }),
      makeDay({ date: '2026-03-19', sleepQuality: 2, habitCompletionRate: 40 }),
      makeDay({ date: '2026-03-20', sleepQuality: 5, habitCompletionRate: 90 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.sleepHabitCorrelation.highSleepCompletion).toBe(90);
    expect(result.sleepHabitCorrelation.lowSleepCompletion).toBe(30);
    expect(result.sleepHabitCorrelation.significant).toBe(true);
  });

  it('computes journal-mood correlation correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 4, journaled: true }),
      makeDay({ date: '2026-03-17', mood: 2, journaled: false }),
      makeDay({ date: '2026-03-18', mood: 5, journaled: true }),
      makeDay({ date: '2026-03-19', mood: 2, journaled: false }),
      makeDay({ date: '2026-03-20', mood: 4, journaled: true }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.journalMoodCorrelation.journalDayMood).toBeCloseTo(4.33, 1);
    expect(result.journalMoodCorrelation.nonJournalDayMood).toBe(2);
    expect(result.journalMoodCorrelation.significant).toBe(true);
  });

  it('identifies the best and hardest days', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 2, sleepQuality: 1, habitCompletionRate: 20, stress: 5 }),
      makeDay({ date: '2026-03-17', mood: 5, sleepQuality: 5, habitCompletionRate: 100, stress: 1 }),
      makeDay({ date: '2026-03-18', mood: 3, sleepQuality: 3, habitCompletionRate: 60, stress: 3 }),
      makeDay({ date: '2026-03-19', mood: 4, sleepQuality: 4, habitCompletionRate: 80, stress: 2 }),
      makeDay({ date: '2026-03-20', mood: 3, sleepQuality: 3, habitCompletionRate: 50, stress: 3 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.bestDay.day).toBe('2026-03-17');
    expect(result.hardestDay.day).toBe('2026-03-16');
  });

  it('computes stress trend correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 3, stress: 5 }),
      makeDay({ date: '2026-03-17', mood: 3, stress: 4 }),
      makeDay({ date: '2026-03-18', mood: 3, stress: 3 }),
      makeDay({ date: '2026-03-19', mood: 3, stress: 2 }),
      makeDay({ date: '2026-03-20', mood: 3, stress: 1 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.stressTrend).toBe('declining');
  });

  it('marks correlations as not significant when gaps are small', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 4, habitCompletionRate: 70 }),
      makeDay({ date: '2026-03-17', sleepQuality: 2, habitCompletionRate: 65 }),
      makeDay({ date: '2026-03-18', sleepQuality: 5, habitCompletionRate: 72 }),
      makeDay({ date: '2026-03-19', sleepQuality: 1, habitCompletionRate: 60 }),
      makeDay({ date: '2026-03-20', sleepQuality: 4, habitCompletionRate: 68 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.sleepHabitCorrelation.significant).toBe(false);
  });
});
