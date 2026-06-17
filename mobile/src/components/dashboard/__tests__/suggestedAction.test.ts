import { suggestedAction, timeOfDay } from '../suggestedAction';

describe('timeOfDay', () => {
  it('buckets the local hour into morning / midday / evening', () => {
    expect(timeOfDay(8)).toBe('morning');
    expect(timeOfDay(13)).toBe('midday');
    expect(timeOfDay(23)).toBe('evening');
  });
});

describe('suggestedAction', () => {
  it('returns the curated short capacity practice per time of day', () => {
    expect(suggestedAction(8)?.protocol.id).toBe('brief-movement-5');
    expect(suggestedAction(13)?.protocol.id).toBe('coherence-breathing-5');
    expect(suggestedAction(23)?.protocol.id).toBe('extended-exhale-2');
  });

  it('always resolves to a real, short (<=5 min) catalog practice', () => {
    [7, 12, 16, 19, 22].forEach((hour) => {
      const s = suggestedAction(hour);
      expect(s).not.toBeNull();
      expect(s!.protocol.timeWindow).toBeLessThanOrEqual(5);
    });
  });

  it('is deterministic for a given hour (independent of any check-in plan)', () => {
    expect(suggestedAction(8)?.protocol.id).toBe(suggestedAction(8)?.protocol.id);
  });
});
