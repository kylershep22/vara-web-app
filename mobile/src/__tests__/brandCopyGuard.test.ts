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

// ---------------------------------------------------------------------------
// Framework words (journey roadmap section 8)
// ---------------------------------------------------------------------------
//
// `remove | recover | rewire | refocus` are KEYS AND FILE NAMES, never words a
// user reads. What the user sees is the title/short/gloss Jen writes in
// PHASE_DISPLAY; the phase key itself never reaches a screen.
//
// SCOPED TO USER-FACING STRING MODULES, not the whole tree. The words are
// legitimate everywhere else - `remove` is an ordinary verb in code, and this
// guard walking all of src/ would flag every array splice and every "Remove
// photo" button in a feature that has nothing to do with the journey. Copy
// modules plus the protocol matrix are where user-visible prose actually lives.
//
// MATCHED INSIDE QUOTED STRINGS ONLY, as whole words. `recovery` is ordinary
// English and does not match `\brecover\b`; `ratingRecovery` is an identifier
// and is not inside quotes. Both are deliberate: a guard that cried wolf on
// those would be waived within a week.

const FRAMEWORK_WORDS = /\b(remove|recover|rewire|refocus)\b/i;
const BARE_FRAMEWORK_WORD = /^(remove|recover|rewire|refocus)$/i;
/** Longest a string can be and still read as a label rather than prose. */
const LABEL_MAX_CHARS = 60;

/**
 * Files waived from THIS rule only, each with the reason.
 *
 * Separate from the em-dash ALLOWLIST above on purpose: a file can be innocent
 * of one and guilty of the other, and a shared waiver list would quietly widen
 * both. Same integrity contract though - an entry naming a file that no longer
 * exists FAILS, so a waiver cannot outlive what it waives.
 */
const FRAMEWORK_ALLOWLIST: Record<string, string> = {
  'src/screens/Focus/blocksCopy.ts':
    'removing a time block is that feature own verb and predates the journey; "Remove block" is not the Remove phase.',
};

/** Every quoted string literal on a line. */
function quotedStrings(line: string): string[] {
  return [...line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? ''
  );
}

function frameworkViolations(relPath: string): Violation[] {
  const raw = fs.readFileSync(path.join(mobileRoot, relPath), 'utf-8');
  const out: Violation[] = [];
  stripBlockComments(raw)
    .split('\n')
    .forEach((rawLine, idx) => {
      const line = stripLineComment(rawLine);
      if (!line.trim() || isModuleSpecifier(line)) return;
      // Placeholder titles name their own phase by design and are exempt via
      // the marker, exactly as the slice-3a brief specifies. The marker is also
      // what the merge gate greps for, so an exemption cannot outlive the
      // content it is standing in for.
      if (line.includes('[PLACEHOLDER] ')) return;
      for (const literal of quotedStrings(line)) {
        // A literal that IS the bare word is a key or a one-word control label
        // (`protocol('remove', ...)`, a "Remove" button), not prose about a
        // phase. Prose containing the word is what this rule is for.
        if (BARE_FRAMEWORK_WORD.test(literal.trim())) continue;
        // LABEL-SHAPED STRINGS ONLY. A phase name leaking into the product
        // shows up as a title, a short, a gloss or a protocol name, all of
        // which are short. In long prose these are ordinary English: "lets
        // attention recover before the next block" is a rationale, not the
        // Recover phase, and a guard that flagged it would be waived within a
        // week and then trusted by nobody. The cap is the line between a label
        // and an explanation.
        if (literal.length > LABEL_MAX_CHARS) continue;
        if (FRAMEWORK_WORDS.test(literal)) {
          out.push({
            file: relPath,
            line: idx + 1,
            label: 'journey framework word in user-facing copy',
            text: literal.slice(0, 120),
          });
        }
      }
    });
  return out;
}

describe('Brand copy guard - journey framework words', () => {
  const files = walk('src');
  const copyModules = files.filter((f) => /copy[^/]*\.tsx?$/i.test(path.basename(f)));
  const scoped = [...copyModules, 'src/protocolEngine/protocolMatrix.ts'].filter(
    (f) => !(f in FRAMEWORK_ALLOWLIST)
  );

  it('scopes to a real, non-trivial set of string modules', () => {
    // Vacuity guard: an empty scope would make the assertion below pass for
    // the wrong reason, which is the exact failure mode the sibling walk test
    // above exists to prevent.
    expect(copyModules.length).toBeGreaterThanOrEqual(8);
    expect(files).toContain('src/protocolEngine/protocolMatrix.ts');
  });

  it('finds no framework word in a user-facing string', () => {
    const violations = scoped.flatMap((f) => frameworkViolations(f));

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  ${v.file}:${v.line}  [${v.label}]\n      ${v.text}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} journey framework word(s) in user-facing copy:\n${detail}\n\n` +
          'remove / recover / rewire / refocus are internal keys (roadmap section 8). ' +
          'The user reads PHASE_DISPLAY copy, never the phase key. Rewrite the string.'
      );
    }
  });
});

describe('Brand copy guard - framework allowlist integrity', () => {
  Object.entries(FRAMEWORK_ALLOWLIST).forEach(([relPath, reason]) => {
    it(`framework-allowlisted file still exists: ${relPath}`, () => {
      if (!fs.existsSync(path.join(mobileRoot, relPath))) {
        throw new Error(
          `FRAMEWORK_ALLOWLIST names a file that no longer exists: ${relPath}
` +
            `  reason on record: ${reason}

` +
            'Remove the entry or repoint it. Waivers must not outlive what they waive.'
        );
      }
    });
  });
});
