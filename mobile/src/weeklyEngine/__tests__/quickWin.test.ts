import { applyQuickWin } from '../quickWin';
import { selectProtocol } from '../selectProtocol';
import type { WeeklyProtocol } from '../types';

const base = (): WeeklyProtocol => selectProtocol('routines', 'normal', 'medium');

describe('applyQuickWin (spec 6.3)', () => {
  it('marks the quick win active in week 1', () => {
    expect(applyQuickWin(base(), 1).quickWinActive).toBe(true);
  });

  it('marks the quick win inactive in week 2', () => {
    expect(applyQuickWin(base(), 2).quickWinActive).toBe(false);
  });

  it('marks the quick win inactive in week 3', () => {
    expect(applyQuickWin(base(), 3).quickWinActive).toBe(false);
  });

  it('carries the practice id through so the caller can resolve it', () => {
    const protocol = base();
    const result = applyQuickWin(protocol, 1);
    expect(result.quickWinPracticeId).toBe(protocol.quickWinPracticeId);
  });

  it('keeps the protocol otherwise identical', () => {
    const protocol = base();
    const result = applyQuickWin(protocol, 1);
    expect(result.id).toBe(protocol.id);
    expect(result.outcome).toBe(protocol.outcome);
    expect(result.capacity).toBe(protocol.capacity);
    expect(result.dailyAction).toBe(protocol.dailyAction);
    expect(result.estMinutes).toBe(protocol.estMinutes);
  });

  it('activates for every outcome, not just the slow-payoff ones', () => {
    for (const outcome of ['focus', 'stress', 'routines', 'energy'] as const) {
      expect(applyQuickWin(selectProtocol(outcome, 'slammed', 'medium'), 1).quickWinActive).toBe(true);
    }
  });

  it('recomputes from weekNumber rather than from a prior result', () => {
    const activated = applyQuickWin(base(), 1);
    expect(activated.quickWinActive).toBe(true);
    expect(applyQuickWin(activated, 2).quickWinActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// supportingPracticeIds means "optional supporting practices" and nothing else.
// The week-1 quick win is a distinct, mandatory same-session step, carried by
// the quickWinActive flag. It must never be smuggled into this list.
// ---------------------------------------------------------------------------
describe('applyQuickWin leaves supportingPracticeIds alone', () => {
  it('does not touch the list in week 1', () => {
    const protocol = base();
    const result = applyQuickWin(protocol, 1);
    expect(result.supportingPracticeIds).toBe(protocol.supportingPracticeIds);
    expect(result.supportingPracticeIds).not.toContain(protocol.quickWinPracticeId);
  });

  it('does not touch the list in weeks 2 and 3', () => {
    for (const weekNumber of [2, 3]) {
      const protocol = base();
      const result = applyQuickWin(protocol, weekNumber);
      expect(result.supportingPracticeIds).toBe(protocol.supportingPracticeIds);
      expect(result.supportingPracticeIds).not.toContain(protocol.quickWinPracticeId);
    }
  });

  it('preserves a non-empty supporting list exactly, without appending', () => {
    const protocol: WeeklyProtocol = {
      ...base(),
      supportingPracticeIds: ['nsdr-10', 'walk-15'],
    };
    expect(applyQuickWin(protocol, 1).supportingPracticeIds).toEqual(['nsdr-10', 'walk-15']);
  });

  it('does not mutate the protocol it was given', () => {
    const protocol = base();
    const before = [...protocol.supportingPracticeIds];
    applyQuickWin(protocol, 1);
    applyQuickWin(protocol, 2);
    expect(protocol.supportingPracticeIds).toEqual(before);
    expect(protocol).not.toHaveProperty('quickWinActive');
  });
});
