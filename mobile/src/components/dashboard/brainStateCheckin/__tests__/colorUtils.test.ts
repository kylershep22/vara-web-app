import { withAlpha } from '../colorUtils';

describe('withAlpha', () => {
  it('converts a 6-digit hex to rgba with the given alpha', () => {
    expect(withAlpha('#D97A6E', 0.12)).toBe('rgba(217, 122, 110, 0.12)');
  });

  it('handles the full amber color correctly', () => {
    expect(withAlpha('#F4C542', 0.3)).toBe('rgba(244, 197, 66, 0.3)');
  });

  it('strips a leading hash if present', () => {
    expect(withAlpha('F4C542', 0.3)).toBe('rgba(244, 197, 66, 0.3)');
  });

  it('preserves alpha values at extremes', () => {
    expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});
