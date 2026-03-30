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
  it('returns 7 slots with correct day labels', () => {
    const slots = buildWeekSlots([]);
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.dayLabel)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('maps history entries to correct slots', () => {
    // Get this Monday's date dynamically
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const slots = buildWeekSlots([{ date: mondayStr, brainState: 'clear' }]);
    expect(slots[0].brainState).toBe('clear');
    expect(slots[0].color).not.toBeNull();
    expect(slots[1].brainState).toBeNull();
  });

  it('leaves slots null for days without history', () => {
    const slots = buildWeekSlots([]);
    for (const slot of slots) {
      expect(slot.brainState).toBeNull();
      expect(slot.color).toBeNull();
    }
  });
});
