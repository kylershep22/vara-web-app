// The continuity count is retired, and this is what stops it coming back
// (journey slice 6, roadmap section 9 R4).
//
// WHY A SOURCE WALK AND NOT tsc. Deleting the modules already makes a surviving
// IMPORT a build error, so that half needs no test. What tsc cannot see is a
// reintroduction: someone writing a fresh `computeContinuity` next year, or a
// new card that counts unbroken weeks under a different name in a different
// file. A grep-shaped guard fails on the name rather than on the wiring, which
// is the half that would otherwise be caught only by a reviewer who happened to
// remember the decision.
//
// COMMENTS ARE DELIBERATELY EXEMPT, and that is not a loophole. The house style
// leaves a retirement note where a deleted thing used to live - this slice left
// several, and 3b's WeeklyOpenScreen notes are still in protocolMatrix.ts - so
// a guard that banned the word outright would force the codebase to forget why
// the thing went. Comments explain; code reintroduces. Only code is banned.
//
// THE SAME COMMENT-STRIPPING PAIR as brandCopyGuard, on purpose: one idiom for
// "banned in code, allowed in prose" rather than two.

import fs from 'fs';
import path from 'path';

const mobileRoot = path.resolve(__dirname, '../..');
const srcRoot = path.join(mobileRoot, 'src');

/**
 * The retired symbols, each with the surface it belonged to.
 *
 * `continuity` ALONE IS NOT ON THE LIST, and leaving it off is deliberate: it
 * is an ordinary English word that appears in unrelated prose, and a guard that
 * fires on it would be turned off rather than obeyed. These are the names that
 * only ever meant the count.
 */
const RETIRED = [
  'ContinuityCard', // the Today card
  'computeContinuity', // the engine function
  'loadWeeklyContinuity', // the storage-to-engine read
  'toWeeklyRecords', // the mapper
  'WeeklyRecord', // the engine input type
  'continuityHeading', // the three copy keys
  'continuityCount',
  'continuityBeforeClose', // the analytics field
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Tests are skipped for the same reason the sentinel skips them: this
      // file names every banned symbol, and a walker that read itself would
      // fail on its own list.
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      sourceFiles(full, acc);
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function relative(file: string): string {
  return path.relative(mobileRoot, file).split(path.sep).join('/');
}

/** Blank out block comments, preserving newlines so line numbers stay true. */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function stripLineComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

const files = sourceFiles(srcRoot);

describe('the continuity count stays retired', () => {
  test('the source tree is readable and non-trivial', () => {
    // Guards against the walker returning nothing, which would make every
    // assertion below pass vacuously. The exact number does not matter; that
    // it is a real tree does.
    expect(files.length).toBeGreaterThan(200);
  });

  test('no retired continuity symbol appears in live code', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const lines = stripBlockComments(fs.readFileSync(file, 'utf8')).split('\n');
      lines.forEach((raw, i) => {
        const code = stripLineComment(raw);
        for (const symbol of RETIRED) {
          if (code.includes(symbol)) {
            offenders.push(`${relative(file)}:${i + 1}  ${symbol}  ${code.trim()}`);
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  test('the walker actually reads code, not just comments', () => {
    // The mutation guard. Without it, a stripper bug that blanked whole files
    // would make the test above pass no matter what was reintroduced. Asserts
    // that a symbol IS found when it is genuinely in code, on a synthetic
    // source rather than on a real file.
    const synthetic = [
      '/* ContinuityCard in a block comment */',
      '// ContinuityCard in a line comment',
      'const x = ContinuityCard;',
    ].join('\n');

    const found = stripBlockComments(synthetic)
      .split('\n')
      .map(stripLineComment)
      .filter((line) => line.includes('ContinuityCard'));

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('const x =');
  });

  test('the deleted modules are gone from disk', () => {
    // The other half, and cheap. A file left behind with no importer would not
    // trip the walk above once its own body stopped naming the symbol.
    for (const gone of [
      'src/components/dashboard/ContinuityCard.tsx',
      'src/screens/weekly/weeklyContinuity.ts',
      'src/protocolEngine/continuity.ts',
    ]) {
      expect(fs.existsSync(path.join(mobileRoot, gone))).toBe(false);
    }
  });
});
