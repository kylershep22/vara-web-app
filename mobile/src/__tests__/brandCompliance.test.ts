/**
 * Brand Compliance Tests - prohibited copy, tree-wide.
 *
 * WHAT CHANGED AND WHY. This suite used to read a hand-maintained SCREEN_FILES
 * list of 13 paths, which covered 10 of the app's 120 screens. Worse, it called
 * `fs.existsSync` and returned early on a miss, so a renamed or deleted file
 * dropped out of the suite silently and the guard went quieter without anyone
 * noticing. It now walks the tree, and a stale allowlist entry is a failure.
 *
 * Prohibited patterns:
 *   - "streak" inside a string literal (variable names are fine)
 *   - "confetti"
 *   - "Unlock Your" / "Subscribe Now" / "Don't break" / "Don't miss"
 *     / "Limited time" / "Act now"
 *
 * FOUR MECHANICS, each earned by a real false positive found when the walk was
 * first widened:
 *
 * 1. COMMENTS ARE STRIPPED, block and line, the same way brandCopyGuard does it.
 *    `screens/Time/components/RoutineCompleteState.tsx:11` is a JSDoc line
 *    reading "No bounce, confetti, fireworks." - a comment stating the rule was
 *    failing the rule. Comments are not copy.
 *
 * 2. IMPORT AND EXPORT SPECIFIER LINES ARE SKIPPED. `components/index.ts:89`
 *    re-exports `./celebrations/StreakMilestoneModal`. A module path is not
 *    user-visible text. (The real fix is renaming that file, which is on the
 *    backlog; this keeps the guard honest until then.)
 *
 * 3. "streak" IS MATCHED INSIDE STRING LITERALS, NOT ANYWHERE ON THE LINE. The
 *    old pattern `/['"`].*streak.*['"`]/i` was greedy and matched from the first
 *    quote on a line to the last, so any line holding two unrelated literals with
 *    the word "streak" loose between them tripped it - e.g.
 *    `wellnessScore.service.ts:431`, which contains no quoted streak at all.
 *    A regex alone cannot express "inside one literal" (tightening it to
 *    `[^'"`]*` still spans the gap BETWEEN two adjacent literals), so literals
 *    are extracted first and tested individually. See the pattern-sanity tests
 *    at the bottom, which pin this behaviour in both directions.
 *
 * 4. `src/screens/_dev/` IS EXCLUDED. Developer test harnesses are not product
 *    copy and do not ship in a production build.
 *
 * THE ALLOWLIST CONTRACT. Every waiver carries a one-line reason. A path in the
 * allowlist that no longer exists FAILS - the entry has to be removed
 * deliberately, so waivers cannot quietly outlive the thing they waived.
 */

import * as fs from 'fs';
import * as path from 'path';

const mobileRoot = path.resolve(__dirname, '../..');

/** Directories excluded from the walk, relative to mobile/. */
const EXCLUDED_DIRS = new Set(['src/screens/_dev']);

/**
 * Files waived from the guard, each with the reason it is waived.
 * Adding an entry here is a decision, not a convenience. Removing a violation
 * is always preferred to waiving it.
 */
const ALLOWLIST: Record<string, string> = {
  'src/screens/onboarding/OnboardingTourScreen.tsx':
    'dark screen; confetti replaced by QuietFinish, only identifier names survive; rename tracked on backlog.',
  'src/constants/featureDiscovery.ts':
    'dark; describes retired streak-gated unlock mechanics; file is a deletion candidate in the legacy-removal slice.',
  'src/services/firebase/wellnessScore.service.ts':
    'dark; describes retired streak-gated unlock mechanics; file is a deletion candidate in the legacy-removal slice. The scored-metric concept itself is banned, not just the string.',
  'src/services/firebase/habits.service.ts':
    'model field names and persisted keys, not user-visible copy; renaming is a data migration.',
  'src/services/firebase/notificationPreferences.service.ts':
    'model field names and persisted keys, not user-visible copy; renaming is a data migration.',
  'src/services/firebase/fourThreeTwoOne.service.ts':
    'model field names and persisted keys, not user-visible copy; renaming is a data migration.',
};

/** Extracts string literals so "streak" is only matched inside one. */
const STRING_LITERAL = /(['"`])(?:\\.|(?!\1)[^\\])*\1/g;

function hasQuotedStreak(line: string): boolean {
  const literals = line.match(STRING_LITERAL);
  return literals ? literals.some((lit) => /streak/i.test(lit)) : false;
}

const PROHIBITED: { label: string; test: (line: string) => boolean }[] = [
  { label: "'streak' inside a string literal", test: hasQuotedStreak },
  { label: 'confetti', test: (l) => /confetti/i.test(l) },
  { label: 'Unlock Your', test: (l) => /Unlock Your/i.test(l) },
  { label: 'Subscribe Now', test: (l) => /Subscribe Now/i.test(l) },
  { label: "Don't break", test: (l) => /Don't break/i.test(l) },
  { label: "Don't miss", test: (l) => /Don't miss/i.test(l) },
  { label: 'Limited time', test: (l) => /Limited time/i.test(l) },
  { label: 'Act now', test: (l) => /Act now/i.test(l) },
];

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
      if (!line.trim() || isModuleSpecifier(line)) return;
      for (const pattern of PROHIBITED) {
        if (pattern.test(line)) {
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

describe('Brand compliance - prohibited copy', () => {
  const files = walk('src');

  it('walks a non-trivial slice of the tree (guards against a broken walk passing vacuously)', () => {
    expect(files.length).toBeGreaterThan(400);
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
        `Found ${violations.length} prohibited-copy violation(s):\n${detail}\n\n` +
          'Fix the copy. Only waive it by adding the file to ALLOWLIST in this ' +
          'file with a one-line reason, and only when the string is genuinely ' +
          'not user-visible or the whole file is a scheduled deletion.'
      );
    }
  });
});

describe('Brand compliance - allowlist integrity', () => {
  const entries = Object.entries(ALLOWLIST);

  it('has at least one reason per entry', () => {
    for (const [file, reason] of entries) {
      expect(`${file}: ${reason}`.length).toBeGreaterThan(file.length + 20);
    }
  });

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

describe('Brand compliance - pattern sanity', () => {
  // A detection change ships with proof it still detects.
  it('still catches a genuine quoted string containing "streak"', () => {
    expect(hasQuotedStreak("  description: 'Build a habit tracking streak',")).toBe(true);
    expect(hasQuotedStreak('  title: "Your streak is safe",')).toBe(true);
    expect(hasQuotedStreak('  label: `${n} day streak`,')).toBe(true);
    expect(hasQuotedStreak("  msg: 'don\\'t break your streak',")).toBe(true);
    expect(hasQuotedStreak("  data: Omit<Habit, 'id' | 'streak' | 'longestStreak'>")).toBe(true);
  });

  it('does not match "streak" that sits between two unrelated literals', () => {
    // The old greedy pattern failed here. wellnessScore.service.ts:431 shape.
    expect(
      hasQuotedStreak(
        "    status: !hasStreakData ? 'missing' : activeStreaks >= 2 ? 'positive' : 'negative',"
      )
    ).toBe(false);
  });

  it('does not match bare identifiers', () => {
    expect(hasQuotedStreak('  const [showStreak, setShowStreak] = useState(false);')).toBe(false);
    expect(hasQuotedStreak('  streak: 0,')).toBe(false);
    expect(hasQuotedStreak('  const streakCount = habit.streak;')).toBe(false);
  });

  it('skips import and export specifier lines', () => {
    expect(
      isModuleSpecifier("export { default as X } from './celebrations/StreakMilestoneModal';")
    ).toBe(true);
    expect(isModuleSpecifier("import Foo from '../StreakMilestoneModal';")).toBe(true);
    expect(isModuleSpecifier("import './sideEffect';")).toBe(true);
    expect(isModuleSpecifier("  const label = 'a streak';")).toBe(false);
  });

  it('strips comments before matching', () => {
    const src = '/* No bounce, confetti, fireworks. */\nconst a = 1;\n// also confetti here\n';
    const cleaned = stripBlockComments(src)
      .split('\n')
      .map(stripLineComment)
      .join('\n');
    expect(/confetti/i.test(cleaned)).toBe(false);
  });
});
