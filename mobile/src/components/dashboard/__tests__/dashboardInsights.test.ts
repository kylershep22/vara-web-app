import { getDashboardInsight } from '../dashboardInsights';

describe('getDashboardInsight', () => {
  it('returns a well-formed insight (title + body)', () => {
    const insight = getDashboardInsight(new Date('2026-06-17T09:00:00'));
    expect(insight.title.length).toBeGreaterThan(0);
    expect(insight.body.length).toBeGreaterThan(0);
  });

  it('is stable within a day and rotates across days', () => {
    // Rotation keys on the UTC day index (getTime()/86400000), so use explicit
    // UTC instants: two within one UTC day, and the next UTC day.
    const day1a = getDashboardInsight(new Date('2026-06-17T06:00:00Z'));
    const day1b = getDashboardInsight(new Date('2026-06-17T18:00:00Z'));
    const day2 = getDashboardInsight(new Date('2026-06-18T06:00:00Z'));
    expect(day1a).toEqual(day1b); // same UTC day → same insight
    // Adjacent days advance the rotation (the set has >1 entry).
    expect(day2).not.toEqual(day1a);
  });
});
