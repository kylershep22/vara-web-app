import { BRAIN_STATE_BRIEFS } from '../brainStateBriefs';

describe('BRAIN_STATE_BRIEFS', () => {
  it('has exactly five entries covering all brain states', () => {
    const keys = Object.keys(BRAIN_STATE_BRIEFS).sort();
    expect(keys).toEqual(['clear', 'energized', 'foggy', 'okay', 'wired']);
  });

  it('each entry has non-empty label, icon, message, and accentColor', () => {
    for (const [state, brief] of Object.entries(BRAIN_STATE_BRIEFS)) {
      expect(brief.label.length).toBeGreaterThan(0);
      expect(brief.icon.length).toBeGreaterThan(0);
      expect(brief.message.length).toBeGreaterThan(0);
      expect(brief.accentColor).toMatch(/^#?[0-9A-Fa-f]{3,8}$|^rgba?\(/);
      expect(brief.label.toLowerCase()).toBe(state);
    }
  });

  it('no message contains an em dash', () => {
    for (const brief of Object.values(BRAIN_STATE_BRIEFS)) {
      expect(brief.message).not.toContain('—');
    }
  });

  it('no message contains gamification language like "unlock"', () => {
    for (const brief of Object.values(BRAIN_STATE_BRIEFS)) {
      expect(brief.message.toLowerCase()).not.toContain('unlock');
    }
  });
});
