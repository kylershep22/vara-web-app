/**
 * Blocks feature brand guard — the coral rule.
 *
 * Soft Coral (#D97A6E) is the app's ONLY error colour and is reserved for
 * genuine error states. The round-2 device walk found the swipe Remove pane
 * painted coral: removing a block you placed yourself is routine housekeeping,
 * not something going wrong, and borrowing the error signal for it devalues the
 * signal everywhere else.
 *
 * Reaching for coral on a destructive control is the natural instinct, which is
 * exactly why this is a test and not only a comment on the style. Read as
 * source, in the manner of brandCopyGuard.test.ts, because the question is
 * "does this token appear here at all", not "what does a render look like".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const FEATURE_ROOT = join(__dirname, '..');

/** Every source file in the blocks feature that can carry a colour. */
const FEATURE_FILES = [
  'AddBlockSheet.tsx',
  'DayBlocksScreen.tsx',
  'blocksCopy.ts',
  'dayShape.ts',
  'suggestPlacement.ts',
  join('components', 'BlockCard.tsx'),
  join('components', 'DayShapeStrip.tsx'),
];

/**
 * Style keys allowed to reference the error colour, per file.
 *
 * Only the add-block sheet has a genuine error state: the failed-save line,
 * which mirrors DailyPickerSheet's treatment. Everything else is empty.
 */
const ERROR_STYLE_KEYS: Record<string, string[]> = {
  'AddBlockSheet.tsx': ['error'],
};

/**
 * The style key a given source line sits under, found by scanning backwards
 * for the nearest two-space-indented `key: {` opener inside StyleSheet.create.
 */
function enclosingStyleKey(lines: string[], index: number): string | null {
  for (let i = index; i >= 0; i--) {
    const match = lines[i].match(/^ {2}([A-Za-z0-9_]+): \{/);
    if (match) return match[1];
  }
  return null;
}

describe('the blocks feature never borrows the error colour', () => {
  it.each(FEATURE_FILES)('%s uses softCoral only in an error style', (relative) => {
    const source = readFileSync(join(FEATURE_ROOT, relative), 'utf8');
    const lines = source.split('\n');
    const allowed = ERROR_STYLE_KEYS[relative] ?? [];

    lines.forEach((line, index) => {
      // Comments naming the rule are fine; only real usages count.
      if (!line.includes('softCoral') || line.trim().startsWith('//')) return;

      const key = enclosingStyleKey(lines, index);
      expect({ file: relative, line: index + 1, style: key }).toEqual({
        file: relative,
        line: index + 1,
        style: expect.stringMatching(new RegExp(`^(${allowed.join('|') || '(?!)'})$`)),
      });
    });
  });

  it('the Remove pane is a neutral destructive treatment, not an error', () => {
    // Pinned by name rather than by hex so a token rename cannot silently
    // reintroduce coral here.
    const source = readFileSync(join(FEATURE_ROOT, 'components', 'BlockCard.tsx'), 'utf8');
    const paneBlock = source.slice(source.indexOf('  action: {'), source.indexOf('  actionLabel: {'));

    expect(paneBlock).toContain('Colors.mutedSageGray');
    expect(paneBlock).not.toContain('softCoral');
  });
});
