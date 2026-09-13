/**
 * Legacy icon-set guard - tree-wide.
 *
 * UI STANDARDS 7. The house icon set is MaterialCommunityIcons, in 178 files.
 * Lucide (11 files) and Ionicons (17 files) are legacy, and section 7's rule is
 * that the allowlist "shrinks as screens are redesigned, never grows". This
 * suite is the machine that holds it.
 *
 * WHY A TEST AND NOT A LINT RULE. `no-restricted-imports` with an `overrides`
 * block gets the shrink-only behaviour, but it cannot fail when an allowlisted
 * path stops existing, and it cannot fail when an allowlisted file stops
 * importing the thing it was waived for. Both are how a waiver outlives what it
 * waived. `brandCompliance.test.ts` already carries the first half of that
 * contract; this suite carries both halves. ASSERTION 3's engine was lifted to
 * `./allowlistIntegrity` in R1d and both suites now run it; its own behaviour is
 * pinned in `allowlistIntegrity.test.ts`, not here.
 *
 * DETECTION IS OVER IMPORT STATEMENTS, NOT MENTIONS, and every clause below was
 * earned by a real file in this tree:
 *
 * 1. A MENTION IS NOT AN IMPORT. `components/shared/SelectChip.tsx:26` reads
 *    "so SelectChip doesn't hard-depend on lucide-react-native's types" in a
 *    comment and imports nothing. A `grep -l` counts 12 Lucide files; there are
 *    11. Comments are stripped before matching.
 *
 * 2. IMPORTS SPAN LINES. `screens/onboarding/OnboardingStressorScreen.tsx`
 *    opens its specifier list at line 16 and closes it at line 23. A
 *    line-anchored `/^import \{[^}]*\} from/` finds 10 of the 11. The scan runs
 *    over the whole source, not line by line.
 *
 * 3. IONICONS IS MATCHED AT THE SPECIFIER, NOT AT THE MODULE. ~150 files import
 *    `MaterialCommunityIcons` from `@expo/vector-icons`, which is the house set
 *    and not legacy. Only the 17 that name `Ionicons` are in scope. Four of
 *    those import both in one statement, so the specifier list is parsed rather
 *    than tested as a string.
 *
 * 4. ALIASES, TYPE-IN-VALUE AND DEFAULTS ALL COUNT. `MaterialCommunityIcons as
 *    MCIcon`, `{ Sunrise, Sun, type LucideIcon }` and `require()` are all import
 *    forms. A namespace or default import of `@expo/vector-icons` is treated as
 *    Ionicons-bearing because the specifier cannot be proven otherwise; no file
 *    does this today, so the clause is conservative and currently inert.
 *
 * SCOPE. `src/` only, matching brandCompliance's walk. `App.tsx` sits outside it
 * and imports no icon set.
 */

import * as fs from 'fs';
import * as path from 'path';
import { allowlistIntegrity } from './allowlistIntegrity';

const mobileRoot = path.resolve(__dirname, '../..');

/** Directories excluded from the walk, relative to mobile/. As brandCompliance. */
const EXCLUDED_DIRS = new Set(['src/screens/_dev']);

const LUCIDE = 'lucide-react-native';
const VECTOR_ICONS = '@expo/vector-icons';

/**
 * Files permitted to import a legacy icon set, each with the reason it is
 * waived. Section 7: this list SHRINKS as screens are redesigned and never
 * grows. Every reason names the redesign row that retires the entry.
 *
 * R6+ is a bucket row, not a slice ("split into its own rows when scoped").
 * Where a surface has no sub-row yet, the reason says so rather than inventing
 * one - a waiver pointing at a row that does not exist is the same failure this
 * suite exists to prevent.
 */
const ALLOWLIST: Record<string, string> = {
  // --- Lucide: 11 files ---------------------------------------------------
  'src/components/dashboard/TodayHeroCard.tsx':
    'Lucide. R3, Today becomes an immersive surface - the card is rebuilt there and the import goes with it.',
  'src/components/onboarding/OnboardingScaffold.tsx':
    'Lucide. R6+ onboarding redesign; section 7 names the onboarding surface as where most of Lucide retires. Shared scaffold, so it retires with the first onboarding sub-row, not the last.',
  'src/components/onboarding/SelectionRow.tsx':
    'Lucide. R6+ onboarding redesign; shared selection row, retires with the onboarding scaffold.',
  'src/screens/onboarding/OnboardingBridgeScreen.tsx':
    'Lucide. R6+ onboarding redesign (no sub-row scoped yet).',
  'src/screens/onboarding/OnboardingPeakWindowScreen.tsx':
    'Lucide. R6+ onboarding redesign (no sub-row scoped yet). Imports `type LucideIcon` alongside three glyphs.',
  'src/screens/onboarding/OnboardingProblemScreen.tsx':
    'Lucide. R6+ onboarding redesign (no sub-row scoped yet).',
  'src/screens/onboarding/OnboardingRecheckScreen.tsx':
    'Lucide. R6+ onboarding redesign (no sub-row scoped yet).',
  'src/screens/onboarding/OnboardingStressorScreen.tsx':
    'Lucide. R6+ onboarding redesign (no sub-row scoped yet). Multi-line specifier list, lines 16-23.',
  'src/screens/onboarding/v3/OnboardingV3ColdOpenScreen.tsx':
    'Lucide. R6+ onboarding redesign; the V3 arc is the live default, so this retires with the arc, not with the V2 screens.',
  'src/screens/onboarding/v3/OnboardingV3DoneScreen.tsx':
    'Lucide. R6+ onboarding redesign; V3 arc, retires with the arc.',
  'src/screens/onboarding/v3/OnboardingV3FirstWinScreen.tsx':
    'Lucide. R6+ onboarding redesign; V3 arc, retires with the arc.',

  // --- Ionicons: 17 files -------------------------------------------------
  'src/components/ai/AIChatModal.tsx':
    'Ionicons. R6+ second group, named in that row: 887 lines declaring their own hex constants at :34-43. The icon import retires with the rewrite, not before it.',
  'src/components/journal/AIWeeklySummaryCard.tsx':
    'Ionicons. R6+ remaining surfaces, Journal (no sub-row scoped yet). Imports Ionicons and MaterialCommunityIcons in one statement; only the former is legacy.',
  'src/components/journal/CollapsibleSearchBar.tsx':
    'Ionicons. R6+ remaining surfaces, Journal (no sub-row scoped yet).',
  'src/components/journal/GentleEncouragementCard.tsx':
    'Ionicons. R6+ remaining surfaces, Journal (no sub-row scoped yet).',
  'src/components/journal/JournalEmptyState.tsx':
    'Ionicons. R6+ remaining surfaces, Journal (no sub-row scoped yet).',
  'src/components/KeyboardDismissButton.tsx':
    'Ionicons. R6+ remaining surfaces. App-wide utility with no owning surface, so it retires on the last Ionicons screen rather than with one redesign.',
  'src/components/messaging/EmptyState.tsx':
    'Ionicons. R6+ second group, Community (no sub-row scoped yet).',
  'src/components/profile/ProfileHeader.tsx':
    'Ionicons. R6+ second group, Profile.',
  'src/screens/ChatScreen.tsx':
    'Ionicons. R6+ second group, Guide (no sub-row scoped yet).',
  'src/screens/community/UserProfileScreen.tsx':
    'Ionicons. R6+ second group, Community. Imports Ionicons and MaterialCommunityIcons as Icon in one statement.',
  'src/screens/ConversationsScreen.tsx':
    'Ionicons. R6+ second group, Community. Imports Ionicons and MaterialCommunityIcons as MCIcon in one statement.',
  'src/screens/JournalScreen.tsx':
    'Ionicons. R6+ remaining surfaces, Journal (no sub-row scoped yet).',
  'src/screens/NotificationSettingsScreen.tsx':
    'Ionicons. R6+ second group, Settings. Imports Ionicons and MaterialCommunityIcons as Icon in one statement.',
  'src/screens/PaywallScreen.tsx':
    'Ionicons. R6+ remaining surfaces (no sub-row scoped yet). Paywall is also gated by the subscription prod-prep work, so the redesign row is not its only dependency.',
  'src/screens/ProfileScreen.tsx':
    'Ionicons. R6+ second group, named in that row: 1008 lines with no SafeAreaView and a `Colors as colors` alias. Retires with the rewrite.',
  'src/screens/RedeemCodeScreen.tsx':
    'Ionicons. R6+ remaining surfaces (no sub-row scoped yet).',
  'src/screens/SettingsScreen.tsx':
    'Ionicons. R6+ second group, named in that row: 995 lines interleaving RevenueCat, a Firestore writeBatch and notification preferences. Retires with the rewrite.',
};

// ---------------------------------------------------------------------------
// Import parsing
// ---------------------------------------------------------------------------

/** Blank block comments while preserving newlines, so line numbers stay true. */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Blank `//` line comments. Applied per line, as brandCompliance does it. */
function stripLineComments(src: string): string {
  return src
    .split('\n')
    .map((line) => {
      const i = line.indexOf('//');
      return i === -1 ? line : line.slice(0, i);
    })
    .join('\n');
}

export interface ImportRecord {
  /** The module specifier, e.g. 'lucide-react-native'. */
  module: string;
  /** Named specifiers as IMPORTED (pre-alias), e.g. ['Ionicons', 'MaterialCommunityIcons']. */
  named: string[];
  /** True for `import X from`, `import * as X from`, a side-effect import, or require(). */
  wholeModule: boolean;
}

/**
 * Parses an import clause's braced specifier list into imported names,
 * discarding aliases and the `type` modifier.
 * `{ Ionicons, MaterialCommunityIcons as Icon, type LucideIcon }`
 *   -> ['Ionicons', 'MaterialCommunityIcons', 'LucideIcon']
 */
function parseNamedSpecifiers(clause: string): string[] {
  const braced = clause.match(/\{([^}]*)\}/);
  if (!braced) return [];
  return braced[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

/**
 * Every import in a source file, multi-line aware.
 *
 * The clause pattern is `[^'"]*?` rather than `[\s\S]*?`: a specifier list can
 * never contain a quote, so a match cannot run past one import's module string
 * into the next statement. That is what makes it safe to scan the whole file at
 * once, which is what clause 2 in the header requires.
 */
export function parseImports(rawSource: string): ImportRecord[] {
  const src = stripLineComments(stripBlockComments(rawSource));
  const out: ImportRecord[] = [];

  // import <clause> from '<module>'
  const withClause = /\bimport\b([^'"]*?)\bfrom\s*['"]([^'"]+)['"]/g;
  for (let m = withClause.exec(src); m !== null; m = withClause.exec(src)) {
    const clause = m[1];
    const named = parseNamedSpecifiers(clause);
    // A default or namespace binding sits outside the braces.
    const outsideBraces = clause.replace(/\{[^}]*\}/g, '').replace(/[,\s]/g, '');
    out.push({ module: m[2], named, wholeModule: outsideBraces.length > 0 });
  }

  // Side-effect import: import '<module>'
  const sideEffect = /\bimport\s*['"]([^'"]+)['"]/g;
  for (let m = sideEffect.exec(src); m !== null; m = sideEffect.exec(src)) {
    out.push({ module: m[1], named: [], wholeModule: true });
  }

  // require('<module>') - the form an eslint import rule cannot see.
  const req = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (let m = req.exec(src); m !== null; m = req.exec(src)) {
    out.push({ module: m[1], named: [], wholeModule: true });
  }

  return out;
}

/** Which legacy icon sets a source file imports. Empty means it is clean. */
export function legacyIconSetsIn(rawSource: string): string[] {
  const found = new Set<string>();
  for (const imp of parseImports(rawSource)) {
    if (imp.module === LUCIDE) {
      // The whole package is legacy; any import form counts.
      found.add('Lucide');
    }
    if (imp.module === VECTOR_ICONS) {
      // Specifier-level: MaterialCommunityIcons is the house set, not legacy.
      // A whole-module import cannot be proven clean, so it counts.
      if (imp.named.includes('Ionicons') || imp.wholeModule) found.add('Ionicons');
    }
  }
  return [...found].sort();
}

// ---------------------------------------------------------------------------
// Tree walk - as brandCompliance
// ---------------------------------------------------------------------------

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

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(mobileRoot, relPath), 'utf-8');
}

// ---------------------------------------------------------------------------
// The three assertions
// ---------------------------------------------------------------------------

describe('Legacy icon sets - allowlist', () => {
  const files = walk('src');

  it('walks a non-trivial slice of the tree (guards against a broken walk passing vacuously)', () => {
    expect(files.length).toBeGreaterThan(400);
  });

  it('sees the legacy sets it is meant to see (guards against a broken detector passing vacuously)', () => {
    const offenders = files.filter((f) => legacyIconSetsIn(readRel(f)).length > 0);
    // 11 Lucide + 17 Ionicons, zero overlap, re-counted at HEAD.
    expect(offenders.length).toBe(28);
  });

  // ASSERTION 1. A non-allowlisted file importing a legacy set fails.
  it('finds no legacy icon import outside the allowlist', () => {
    const violations = files
      .filter((f) => !(f in ALLOWLIST))
      .map((f) => ({ file: f, sets: legacyIconSetsIn(readRel(f)) }))
      .filter((v) => v.sets.length > 0);

    if (violations.length > 0) {
      const detail = violations.map((v) => `  ${v.file}  [${v.sets.join(', ')}]`).join('\n');
      throw new Error(
        `Found ${violations.length} file(s) importing a legacy icon set outside the allowlist:\n${detail}\n\n` +
          'UI Standards 7: the house set is MaterialCommunityIcons from @expo/vector-icons. ' +
          'Use it. The allowlist shrinks as screens are redesigned and never grows, so a new ' +
          'entry is not the fix here.'
      );
    }
  });
});

describe('Legacy icon sets - allowlist integrity', () => {
  const { missing, clean } = allowlistIntegrity(ALLOWLIST, mobileRoot, (p) =>
    legacyIconSetsIn(readRel(p)).length > 0
  );

  it('has a reason per entry that names a redesign row', () => {
    for (const [file, reason] of Object.entries(ALLOWLIST)) {
      expect(`${file}: ${reason}`.length).toBeGreaterThan(file.length + 20);
      expect(reason).toMatch(/\bR\d/);
    }
  });

  // ASSERTION 2. An allowlisted path that does not exist fails.
  it('names no file that has been deleted or renamed', () => {
    if (missing.length > 0) {
      const detail = missing
        .map((p) => `  ${p}\n      reason on record: ${ALLOWLIST[p]}`)
        .join('\n');
      throw new Error(
        `ALLOWLIST names ${missing.length} file(s) that no longer exist:\n${detail}\n\n` +
          'The file was renamed or deleted. Remove the entry, or repoint it. ' +
          'Waivers must not outlive what they waive.'
      );
    }
  });

  // ASSERTION 3. An allowlisted path that exists but no longer imports fails.
  // This is the half brandCompliance lacks.
  it('names no file that has already stopped importing a legacy icon set', () => {
    if (clean.length > 0) {
      const detail = clean
        .map((p) => `  ${p}\n      reason on record: ${ALLOWLIST[p]}`)
        .join('\n');
      throw new Error(
        `ALLOWLIST names ${clean.length} file(s) that no longer import Lucide or Ionicons:\n${detail}\n\n` +
          'The redesign this waiver was written for has landed - remove the entry. ' +
          'A waiver left behind after the import is gone is how the allowlist stops shrinking.'
      );
    }
  });
});

describe('Legacy icon sets - detector sanity', () => {
  // A detection change ships with proof it still detects.

  it('catches a plain named Lucide import', () => {
    expect(legacyIconSetsIn("import { Check } from 'lucide-react-native';")).toEqual(['Lucide']);
  });

  it('catches a Lucide import whose specifier list spans lines (the 11th file)', () => {
    const src = [
      'import {',
      '  Gauge,',
      '  Leaf,',
      '  type LucideIcon,',
      "} from 'lucide-react-native';",
    ].join('\n');
    expect(legacyIconSetsIn(src)).toEqual(['Lucide']);
  });

  it('does NOT count a comment that merely mentions the package (SelectChip.tsx)', () => {
    const src = [
      '// Minimal shape of a Lucide icon component (size / color / strokeWidth). Kept',
      "// local so SelectChip doesn't hard-depend on lucide-react-native's types.",
      '/* lucide-react-native */',
      "import { StyleSheet } from 'react-native';",
    ].join('\n');
    expect(legacyIconSetsIn(src)).toEqual([]);
  });

  it('catches Ionicons at the specifier level, alongside MCI in one statement', () => {
    expect(
      legacyIconSetsIn(
        "import { Ionicons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';"
      )
    ).toEqual(['Ionicons']);
  });

  it('does NOT count an MCI-only import, aliased or not (the ~150 house-set files)', () => {
    expect(
      legacyIconSetsIn("import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';")
    ).toEqual([]);
    expect(legacyIconSetsIn("import { MaterialCommunityIcons } from '@expo/vector-icons';")).toEqual(
      []
    );
    expect(
      legacyIconSetsIn("import { MaterialCommunityIcons as MCIcon } from '@expo/vector-icons';")
    ).toEqual([]);
  });

  it('counts a whole-module import of the icon package, which cannot be proven clean', () => {
    expect(legacyIconSetsIn("import * as VectorIcons from '@expo/vector-icons';")).toEqual([
      'Ionicons',
    ]);
    expect(legacyIconSetsIn("import VectorIcons from '@expo/vector-icons';")).toEqual(['Ionicons']);
  });

  it('catches require(), the form an eslint import rule cannot see', () => {
    expect(legacyIconSetsIn("const { Check } = require('lucide-react-native');")).toEqual(['Lucide']);
  });

  it('reports both sets when a file imports both', () => {
    const src = [
      "import { Check } from 'lucide-react-native';",
      "import { Ionicons } from '@expo/vector-icons';",
    ].join('\n');
    expect(legacyIconSetsIn(src)).toEqual(['Ionicons', 'Lucide']);
  });

  it('does not let one import statement swallow the next', () => {
    const src = [
      "import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';",
      "import { View } from 'react-native';",
    ].join('\n');
    const mods = parseImports(src).map((i) => i.module);
    expect(mods).toEqual(['@expo/vector-icons', 'react-native']);
  });
});
