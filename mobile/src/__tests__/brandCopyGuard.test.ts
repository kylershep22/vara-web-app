/**
 * Brand Copy Regression Guard - em dash + optim* class, tree-wide.
 *
 * WHAT CHANGED AND WHY. This suite used to read a curated COPY_SOURCES list of
 * 32 paths, grown one slice at a time. The Aug 2026 Step-0 audit found that
 * every one of the eight modules named `*copy*.ts` was outside it - including
 * `screens/Focus/blocksCopy.ts` and `screens/weekly/copy.ts`, the two the brand
 * voice doc explicitly says it does not cover. So the strings least governed by
 * the guidelines were also the least guarded. It now walks the tree.
 *
 * Like COPY_SOURCES before it, this suite skips a file that is silently missing
 * only if that file is in ALLOWLIST, and an allowlisted path that stops existing
 * is a failure.
 *
 * Guarded against:
 *   - the em dash (U+2014) in user-facing copy
 *   - "optimize" / "optimizer" / "optimization" / "optimizing", case-insensitive,
 *     including British -ise/-isation
 *
 * DELIBERATELY NOT MATCHED, all carried over from the curated version:
 *   - En dashes (U+2013) in numeric ranges. Only U+2014 is prohibited.
 *   - Anything inside a comment. Block and line comments are stripped before
 *     scanning, so prose em dashes in JSDoc are not user-facing and do not trip.
 *   - `evening-sleep-optimizer`, a persisted routine-template id. Renaming it
 *     would orphan existing user completion data. The visible name is already
 *     "Sleep Wind-Down"; only the stable id retains the old word.
 *   - `src/screens/_dev/`, developer test harnesses, excluded wholesale.
 *   - import and export specifier lines. A module path is not copy.
 */

import * as fs from 'fs';
import * as path from 'path';

const mobileRoot = path.resolve(__dirname, '../..');

/** Directories excluded from the walk, relative to mobile/. */
const EXCLUDED_DIRS = new Set(['src/screens/_dev']);

/**
 * Files waived from the guard, each with the reason it is waived.
 * Adding an entry here is a decision, not a convenience.
 */
const ALLOWLIST: Record<string, string> = {
  'src/services/api/ai.service.ts':
    'em-dash regex literals ARE the enforcement mechanism; guarding this file fails the code enforcing the guard.',
};

// U+2014 EM DASH, built via char code so no literal em-dash byte lives in this
// source file, and so the guard never flags its own definition.
const EM_DASH = String.fromCharCode(0x2014);

const PROHIBITED_PATTERNS = [
  { label: 'em dash (U+2014)', re: new RegExp(EM_DASH) },
  {
    label: 'optim* (optimize / optimizer / optimization)',
    re: /optimi[sz](?:e|er|ation|ing)/i,
  },
];

const ALLOWLIST_PATTERNS = [/evening-sleep-optimizer/];

/** Blank block comments while preserving newlines, so line numbers stay true. */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function stripLineComment(line: string): string {
  const i = line.indexOf('//');
  return i === -1 ? line : line.slice(0, i);
}

function isModuleSpecifier(line: string): boolean {
  return (
    /^\s*(import|export)\b[\s\S]*\bfrom\s*['"]/.test(line) ||
    /^\s*import\s*['"]/.test(line)
  );
}

function isLineAllowlisted(line: string): boolean {
  return ALLOWLIST_PATTERNS.some((p) => p.test(line));
}

function walk(dirRel: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(mobileRoot, dirRel), { withFileTypes: true })) {
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || EXCLUDED_DIRS.has(rel)) continue;
      walk(rel, acc);
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.(test|spec)\.tsx?$/.test(entry.name) &&
      !/\.d\.ts$/.test(entry.name)
    ) {
      acc.push(rel);
    }
  }
  return acc;
}

interface Violation {
  file: string;
  line: number;
  label: string;
  text: string;
}

function scan(relPath: string): Violation[] {
  const raw = fs.readFileSync(path.join(mobileRoot, relPath), 'utf-8');
  const out: Violation[] = [];
  stripBlockComments(raw)
    .split('\n')
    .forEach((rawLine, idx) => {
      const line = stripLineComment(rawLine);
      if (!line.trim() || isModuleSpecifier(line) || isLineAllowlisted(line)) return;
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.re.test(line)) {
          out.push({
            file: relPath,
            line: idx + 1,
            label: pattern.label,
            text: line.trim().slice(0, 120),
          });
        }
      }
    });
  return out;
}

describe('Brand copy guard - em dash + optim*', () => {
  const files = walk('src');

  it('walks a non-trivial slice of the tree (guards against a broken walk passing vacuously)', () => {
    expect(files.length).toBeGreaterThan(400);
  });

  it('covers every *copy*.ts module in the tree', () => {
    // The gap that motivated this rewrite: all eight were outside COPY_SOURCES.
    const copyModules = files.filter((f) => /copy[^/]*\.tsx?$/i.test(path.basename(f)));
    expect(copyModules.length).toBeGreaterThanOrEqual(8);
    for (const m of copyModules) {
      expect(m in ALLOWLIST).toBe(false);
    }
  });

  it('finds no prohibited copy outside the allowlist', () => {
    const violations = files
      .filter((f) => !(f in ALLOWLIST))
      .flatMap((f) => scan(f));

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  ${v.file}:${v.line}  [${v.label}]\n      ${v.text}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} brand copy violation(s):\n${detail}\n\n` +
          'Replace the em dash (a comma, a period, or a rewrite) or the optim* ' +
          'word. Only waive by adding the file to ALLOWLIST in this file with a ' +
          'one-line reason.'
      );
    }
  });
});

describe('Brand copy guard - allowlist integrity', () => {
  const entries = Object.entries(ALLOWLIST);

  entries.forEach(([relPath, reason]) => {
    it(`allowlisted file still exists: ${relPath}`, () => {
      const exists = fs.existsSync(path.join(mobileRoot, relPath));
      if (!exists) {
        throw new Error(
          `ALLOWLIST names a file that no longer exists: ${relPath}\n` +
            `  reason on record: ${reason}\n\n` +
            'The file was renamed or deleted. Remove the entry, or repoint it. ' +
            'Waivers must not outlive what they waive.'
        );
      }
    });
  });
});

describe('Brand copy guard - pattern sanity', () => {
  const emDashLine = `  title: 'Focus ${EM_DASH} the deep kind',`;
  const enDashLine = `  label: '20${String.fromCharCode(0x2013)}30 minutes',`;

  it('catches an em dash in copy', () => {
    expect(PROHIBITED_PATTERNS[0].re.test(emDashLine)).toBe(true);
  });

  it('leaves en dashes in numeric ranges alone', () => {
    expect(PROHIBITED_PATTERNS[0].re.test(enDashLine)).toBe(false);
  });

  it('catches the optim* family including British spellings', () => {
    const re = PROHIBITED_PATTERNS[1].re;
    for (const word of ['optimize', 'Optimizer', 'optimisation', 'OPTIMIZING', 'optimise']) {
      expect(re.test(`  copy: 'Sleep ${word} routine',`)).toBe(true);
    }
  });

  it('keeps the evening-sleep-optimizer persisted id exempt', () => {
    expect(isLineAllowlisted("  id: 'evening-sleep-optimizer',")).toBe(true);
  });

  it('strips comments before matching', () => {
    const src = `/* prose ${EM_DASH} with an em dash */\nconst a = 1;\n// another ${EM_DASH} here\n`;
    const cleaned = stripBlockComments(src)
      .split('\n')
      .map(stripLineComment)
      .join('\n');
    expect(cleaned.includes(EM_DASH)).toBe(false);
  });
});
