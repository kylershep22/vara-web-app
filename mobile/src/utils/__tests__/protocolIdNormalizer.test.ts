import {
  LEGACY_PROTOCOL_ID_MAP,
  normalizeProtocolId,
} from '../protocolIdNormalizer';

describe('normalizeProtocolId', () => {
  describe('legacy mappings', () => {
    it('maps "extended-exhale" to "extended-exhale-2" (always-suffix scheme)', () => {
      expect(normalizeProtocolId('extended-exhale')).toBe('extended-exhale-2');
    });

    it('maps "micro-reset" to "sensory-reset-2"', () => {
      expect(normalizeProtocolId('micro-reset')).toBe('sensory-reset-2');
    });

    it('returns null for retired "activating-breathwork" (Bellows Breath cut at v1)', () => {
      expect(normalizeProtocolId('activating-breathwork')).toBeNull();
    });

    it('returns null for retired "gratitude-clarity"', () => {
      expect(normalizeProtocolId('gratitude-clarity')).toBeNull();
    });

    it('returns null for retired "focus-primer"', () => {
      expect(normalizeProtocolId('focus-primer')).toBeNull();
    });
  });

  describe('current-library and unknown ids', () => {
    it('passes a current-library id through unchanged', () => {
      expect(normalizeProtocolId('cyclic-sighing-2')).toBe('cyclic-sighing-2');
      expect(normalizeProtocolId('nsdr-10')).toBe('nsdr-10');
    });

    it('passes an unknown id through (call site validates)', () => {
      expect(normalizeProtocolId('something-new')).toBe('something-new');
    });

    it('trims surrounding whitespace before lookup', () => {
      expect(normalizeProtocolId('  micro-reset  ')).toBe('sensory-reset-2');
      expect(normalizeProtocolId('\textended-exhale\n')).toBe(
        'extended-exhale-2'
      );
    });
  });

  describe('null-shaped input', () => {
    it('returns null for null', () => {
      expect(normalizeProtocolId(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(normalizeProtocolId(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeProtocolId('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(normalizeProtocolId('   ')).toBeNull();
    });
  });

  describe('invalid input', () => {
    it('throws TypeError on non-string non-nullish input', () => {
      expect(() =>
        normalizeProtocolId(42 as unknown as string)
      ).toThrow(TypeError);
      expect(() =>
        normalizeProtocolId({} as unknown as string)
      ).toThrow(TypeError);
    });
  });

  describe('LEGACY_PROTOCOL_ID_MAP shape', () => {
    it('contains exactly the five known legacy ids', () => {
      expect(Object.keys(LEGACY_PROTOCOL_ID_MAP).sort()).toEqual([
        'activating-breathwork',
        'extended-exhale',
        'focus-primer',
        'gratitude-clarity',
        'micro-reset',
      ]);
    });

    it('orphans three legacy ids (no successor in new library)', () => {
      const orphans = Object.entries(LEGACY_PROTOCOL_ID_MAP)
        .filter(([, v]) => v === null)
        .map(([k]) => k)
        .sort();
      expect(orphans).toEqual([
        'activating-breathwork',
        'focus-primer',
        'gratitude-clarity',
      ]);
    });
  });
});
