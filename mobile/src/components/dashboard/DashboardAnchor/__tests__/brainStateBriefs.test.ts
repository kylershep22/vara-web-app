import { BRAIN_STATE_BRIEFS, getBrainStateBrief } from '../brainStateBriefs';
import type { BrainState } from '../../../../types';

const ALL_STATES: BrainState[] = ['wired', 'foggy', 'okay', 'clear', 'energized'];

describe('BRAIN_STATE_BRIEFS', () => {
  it('has exactly five entries covering all brain states', () => {
    const keys = Object.keys(BRAIN_STATE_BRIEFS).sort();
    expect(keys).toEqual(['clear', 'energized', 'foggy', 'okay', 'wired']);
  });

  it('each state has exactly three variants', () => {
    for (const state of ALL_STATES) {
      expect(BRAIN_STATE_BRIEFS[state]).toHaveLength(3);
    }
  });

  it('every variant has non-empty label, icon, message, and accentColor', () => {
    for (const [state, variants] of Object.entries(BRAIN_STATE_BRIEFS)) {
      for (const brief of variants) {
        expect(brief.label.length).toBeGreaterThan(0);
        expect(brief.icon.length).toBeGreaterThan(0);
        expect(brief.message.length).toBeGreaterThan(0);
        expect(brief.accentColor).toMatch(/^#?[0-9A-Fa-f]{3,8}$|^rgba?\(/);
        expect(brief.label.toLowerCase()).toBe(state);
      }
    }
  });

  it('no variant message contains an em dash', () => {
    for (const variants of Object.values(BRAIN_STATE_BRIEFS)) {
      for (const brief of variants) {
        expect(brief.message).not.toContain('—');
      }
    }
  });

  it('no variant message contains gamification language like "unlock"', () => {
    for (const variants of Object.values(BRAIN_STATE_BRIEFS)) {
      for (const brief of variants) {
        expect(brief.message.toLowerCase()).not.toContain('unlock');
      }
    }
  });

  it('each state\'s three variant messages are distinct', () => {
    for (const state of ALL_STATES) {
      const messages = BRAIN_STATE_BRIEFS[state].map((v) => v.message);
      expect(new Set(messages).size).toBe(3);
    }
  });
});

describe('getBrainStateBrief', () => {
  const FIXED_DATE = new Date('2026-04-20T12:00:00Z');

  it('returns an object matching the BrainStateBrief shape for every state', () => {
    for (const state of ALL_STATES) {
      const brief = getBrainStateBrief(state, FIXED_DATE);
      expect(brief.label.toLowerCase()).toBe(state);
      expect(brief.message.length).toBeGreaterThan(0);
      expect(brief.icon.length).toBeGreaterThan(0);
      expect(brief.accentColor.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic: same state and date returns the same variant on repeated calls', () => {
    for (const state of ALL_STATES) {
      const a = getBrainStateBrief(state, FIXED_DATE);
      const b = getBrainStateBrief(state, FIXED_DATE);
      const c = getBrainStateBrief(state, new Date(FIXED_DATE.getTime()));
      expect(a.message).toBe(b.message);
      expect(a.message).toBe(c.message);
    }
  });

  it('cycles through three distinct variants over three consecutive days', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    for (const state of ALL_STATES) {
      const day0 = getBrainStateBrief(state, new Date(FIXED_DATE.getTime()));
      const day1 = getBrainStateBrief(state, new Date(FIXED_DATE.getTime() + DAY_MS));
      const day2 = getBrainStateBrief(state, new Date(FIXED_DATE.getTime() + 2 * DAY_MS));
      const messages = new Set([day0.message, day1.message, day2.message]);
      expect(messages.size).toBe(3);
    }
  });

  it('repeats variant 0 on day 3 (cycle length = 3)', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    for (const state of ALL_STATES) {
      const day0 = getBrainStateBrief(state, new Date(FIXED_DATE.getTime()));
      const day3 = getBrainStateBrief(state, new Date(FIXED_DATE.getTime() + 3 * DAY_MS));
      expect(day3.message).toBe(day0.message);
    }
  });

  it('is stable across multiple times of day on the same UTC date', () => {
    const earlyMorning = new Date('2026-04-20T01:00:00Z');
    const lateNight = new Date('2026-04-20T23:00:00Z');
    for (const state of ALL_STATES) {
      const early = getBrainStateBrief(state, earlyMorning);
      const late = getBrainStateBrief(state, lateNight);
      expect(early.message).toBe(late.message);
    }
  });
});
