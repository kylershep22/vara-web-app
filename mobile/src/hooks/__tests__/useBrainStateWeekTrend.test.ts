import { computeSummary, buildWeekSlots, DaySlot } from '../useBrainStateWeekTrend';

function makeSlot(brainState: string | null): DaySlot {
  return {
    date: '2026-03-23',
    dayLabel: 'M',
    brainState: brainState as DaySlot['brainState'],
    color: null,
  };
}

describe('computeSummary', () => {
  it('returns null when fewer than 2 days have data', () => {
    const days = [
      makeSlot('clear'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    expect(computeSummary(days)).toBeNull();
  });

  it('returns dominant state when 3+ days match', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Foggy 3 of 4 days');
  });

  it('returns trending clearer when later days rank higher', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot('energized'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Trending clearer this week');
  });

  it('returns trending foggier when later days rank lower', () => {
    const days = [
      makeSlot('energized'),
      makeSlot('clear'),
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Trending foggier this week');
  });

  it('returns mixed week fallback with top 2 states', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot('okay'),
      makeSlot('wired'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toMatch(/^Mixed week/);
  });

  it('returns summary with exactly 2 days of data', () => {
    const days = [
      makeSlot('clear'),
      makeSlot('foggy'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).not.toBeNull();
  });
});

describe('buildWeekSlots', () => {
  it('returns 7 slots', () => {
    const slots = buildWeekSlots([]);
    expect(slots).toHaveLength(7);
  });

  it('uses rolling last-7-days window with today as last slot', () => {
    // Today's date should be the last slot (index 6)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const slots = buildWeekSlots([{ date: todayStr, brainState: 'clear' }]);
    expect(slots[6].brainState).toBe('clear');
    expect(slots[6].date).toBe(todayStr);
    expect(slots[6].color).not.toBeNull();
  });

  it('maps yesterday to second-to-last slot', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const slots = buildWeekSlots([{ date: yesterdayStr, brainState: 'foggy' }]);
    expect(slots[5].brainState).toBe('foggy');
    expect(slots[5].date).toBe(yesterdayStr);
  });

  it('assigns correct day labels based on actual day of week', () => {
    const slots = buildWeekSlots([]);
    // Each slot's dayLabel should match the actual day of week for that date
    for (const slot of slots) {
      const d = new Date(slot.date + 'T00:00:00');
      const dayIndex = (d.getDay() + 6) % 7; // Mon=0 based
      expect(slot.dayLabel).toBe(['M', 'T', 'W', 'T', 'F', 'S', 'S'][dayIndex]);
    }
  });

  it('leaves slots null for days without history', () => {
    const slots = buildWeekSlots([]);
    for (const slot of slots) {
      expect(slot.brainState).toBeNull();
      expect(slot.color).toBeNull();
    }
  });
});
