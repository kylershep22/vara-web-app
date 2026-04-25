import type { BrainState } from '../../types/models';
import {
  normalizeBrainState,
  serializeBrainState,
} from '../brainStateNormalizer';
import { logger } from '../logger';

describe('normalizeBrainState', () => {
  describe('legacy values', () => {
    it('maps "okay" to "steady"', () => {
      expect(normalizeBrainState('okay')).toBe('steady');
    });

    it('maps "energized" to "alive"', () => {
      expect(normalizeBrainState('energized')).toBe('alive');
    });
  });

  describe('current values', () => {
    it.each(['wired', 'foggy', 'steady', 'clear', 'alive'])(
      'passes "%s" through unchanged',
      (value) => {
        expect(normalizeBrainState(value)).toBe(value);
      }
    );
  });

  describe('case and whitespace', () => {
    it('normalizes uppercase legacy values', () => {
      expect(normalizeBrainState('OKAY')).toBe('steady');
      expect(normalizeBrainState('Energized')).toBe('alive');
    });

    it('normalizes uppercase current values', () => {
      expect(normalizeBrainState('WIRED')).toBe('wired');
      expect(normalizeBrainState('Steady')).toBe('steady');
    });

    it('trims surrounding whitespace', () => {
      expect(normalizeBrainState('  okay  ')).toBe('steady');
      expect(normalizeBrainState('\tclear\n')).toBe('clear');
    });
  });

  describe('invalid input', () => {
    it('throws on empty string', () => {
      expect(() => normalizeBrainState('')).toThrow(
        'unknown brain state value'
      );
    });

    it('throws on unknown label', () => {
      expect(() => normalizeBrainState('happy')).toThrow(
        'unknown brain state value'
      );
      expect(() => normalizeBrainState('stressed')).toThrow(
        'unknown brain state value'
      );
    });

    it('includes the original value in the error', () => {
      expect(() => normalizeBrainState('unknown')).toThrow(
        /unknown brain state value "unknown"/
      );
    });

    it('throws TypeError on non-string input', () => {
      expect(() =>
        normalizeBrainState(null as unknown as string)
      ).toThrow(TypeError);
      expect(() =>
        normalizeBrainState(undefined as unknown as string)
      ).toThrow(TypeError);
      expect(() =>
        normalizeBrainState(42 as unknown as string)
      ).toThrow(TypeError);
    });
  });
});

describe('serializeBrainState', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(['wired', 'foggy', 'steady', 'clear', 'alive'])(
    'passes "%s" through unchanged without warning',
    (value) => {
      expect(serializeBrainState(value as BrainState)).toBe(value);
      expect(warnSpy).not.toHaveBeenCalled();
    }
  );

  it('maps a legacy "okay" value to "steady" and logs a warning', () => {
    const result = serializeBrainState('okay' as unknown as BrainState);
    expect(result).toBe('steady');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/legacy value "okay"/);
  });

  it('maps a legacy "energized" value to "alive" and logs a warning', () => {
    const result = serializeBrainState('energized' as unknown as BrainState);
    expect(result).toBe('alive');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/legacy value "energized"/);
  });
});
