import { classifyQuadrant } from '../quadrant';

describe('classifyQuadrant (§2)', () => {
  it('revved + hard → Tense', () => {
    expect(classifyQuadrant('revved', 'hard')).toBe('Tense');
  });
  it('revved + good → Activated', () => {
    expect(classifyQuadrant('revved', 'good')).toBe('Activated');
  });
  it('low + hard → Depleted', () => {
    expect(classifyQuadrant('low', 'hard')).toBe('Depleted');
  });
  it('low + good → Calm', () => {
    expect(classifyQuadrant('low', 'good')).toBe('Calm');
  });
});
