/**
 * Release gate for unapproved copy.
 *
 * WHY THIS EXISTS. Draft strings used to announce themselves: they rendered a
 * "[COPY GAP] " or "[Jen] " prefix on screen, so no build could be mistaken for
 * finished product and a couple of tests could assert the marker was there.
 * That convention is retired because no marker text may reach the UI, and what
 * replaced it is a comment sentinel sitting above each drafted string. A comment
 * is visible to whoever opens the file and to nobody else, so on its own it
 * enforces nothing. This suite is the enforcement.
 *
 * THE CONTRACT, and it is the whole point of pinning a number:
 *
 *   - The count goes DOWN when Jen approves a string. Remove that string's
 *     sentinel and decrement EXPECTED_SENTINELS in the same commit.
 *   - The count goes UP when new drafted copy lands. Add the sentinel and
 *     increment EXPECTED_SENTINELS in the same commit.
 *   - EITHER DIRECTION MUST BE NAMED IN THE COMMIT MESSAGE that makes it, with
 *     the strings involved. A silent edit to this number is the failure mode
 *     this test exists to prevent: it is the difference between "Jen signed off
 *     on nine strings" and "someone deleted nine inconvenient comments".
 *
 * A red build here is not a bug in the test. It means the set of unapproved
 * strings changed and the change has not been accounted for.
 *
 * OUT OF SCOPE: protocolEngine's `PLACEHOLDER [Jen]` annotations. That is a
 * different convention on a different pipeline (protocol content, "why this
 * works" education and efficacy claims, all authored and reviewed by Jen rather
 * than written against the brand guidelines), and it is excluded here so the two
 * never get conflated or traded off against each other.
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * The pinned number of drafted strings in mobile/src.
 *
 * Read the contract in this file's header before changing it.
 */
const EXPECTED_SENTINELS = 165;

const mobileRoot = path.resolve(__dirname, '../..');
const srcRoot = path.join(mobileRoot, 'src');

// Built by concatenation so the needles never appear literally in this file.
// Without that, the suite would count and flag itself.
const SENTINEL = 'COPY: draft,' + ' not from guidelines doc';
const RENDERED_MARKERS = [
  '[' + 'COPY GAP]',
  '[' + 'Jen]',
  '[' + 'Jen review]',
];

// The protocol content pipeline, excluded per the header.
const OUT_OF_SCOPE = ['src/protocolEngine/protocolMatrix.ts', 'src/protocolEngine/types.ts'];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Tests are not a copy surface. Skipping them also keeps this file, and any
    // future test that quotes a marker while documenting one, out of the counts.
    if (entry.isDirectory()) {
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

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
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
const inScope = files.filter((f) => !OUT_OF_SCOPE.includes(relative(f)));

describe('Copy draft sentinel - release gate', () => {
  test('the source tree is readable and non-trivial', () => {
    // Guards against the walker silently returning nothing, which would make
    // every assertion below vacuously true.
    expect(files.length).toBeGreaterThan(100);
  });

  test(`exactly ${EXPECTED_SENTINELS} drafted strings remain`, () => {
    const perFile: Array<[string, number]> = [];
    let total = 0;

    for (const file of inScope) {
      const n = occurrences(fs.readFileSync(file, 'utf8'), SENTINEL);
      if (n > 0) perFile.push([relative(file), n]);
      total += n;
    }

    // Sorted, so the failure message reads as a diffable inventory rather than
    // in filesystem order.
    perFile.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const inventory = perFile.map(([f, n]) => `  ${String(n).padStart(4)}  ${f}`).join('\n');

    if (total !== EXPECTED_SENTINELS) {
      const direction = total < EXPECTED_SENTINELS ? 'FEWER' : 'MORE';
      throw new Error(
        `Expected ${EXPECTED_SENTINELS} drafted strings, found ${total} (${direction}).\n\n` +
          (total < EXPECTED_SENTINELS
            ? 'Strings were approved, or sentinels were dropped without approval.\n'
            : 'New drafted copy landed.\n') +
          'Either way: update EXPECTED_SENTINELS in this file AND name the change,\n' +
          'with the strings involved, in the commit that makes it. See the header.\n\n' +
          `Current inventory:\n${inventory}`
      );
    }

    expect(total).toBe(EXPECTED_SENTINELS);
  });

  test('no marker text reaches the UI', () => {
    // The enforcement the on-screen markers used to provide, kept as an
    // assertion rather than as text a user can see. Comments are stripped
    // first: this file, and several headers, discuss the retired markers by
    // name and must stay free to do so.
    const offenders: string[] = [];

    for (const file of inScope) {
      const src = stripBlockComments(fs.readFileSync(file, 'utf8'));
      src.split('\n').forEach((rawLine, i) => {
        const line = stripLineComment(rawLine);
        for (const marker of RENDERED_MARKERS) {
          if (line.includes(marker)) {
            offenders.push(`${relative(file)}:${i + 1}  ${line.trim()}`);
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  test('the protocol content pipeline is excluded, not accidentally clean', () => {
    // If protocolMatrix ever stops using its own annotation convention, this
    // fails and the exclusion above should be revisited rather than left
    // pointing at a file that no longer needs it.
    const matrix = fs.readFileSync(
      path.join(mobileRoot, 'src/protocolEngine/protocolMatrix.ts'),
      'utf8'
    );

    expect(matrix).toContain('PLACEHOLDER ' + '[Jen]');
    expect(occurrences(matrix, SENTINEL)).toBe(0);
  });
});
