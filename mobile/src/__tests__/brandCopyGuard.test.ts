/**
 * Brand Copy Regression Guard - em-dash + optim* class.
 *
 * Companion to brandCompliance.test.ts. Guards a curated set of mobile
 * copy/content sources against re-introducing two brand-guardrail
 * violations that were swept out in the brand-hygiene pass:
 *   - the em dash (U+2014) in user-facing copy
 *   - "optimize" / "optimizer" / "optimization" (case-insensitive,
 *     including British -ise/-isation)
 *
 * Scope is deliberately NARROW: data/catalog modules plus the two
 * rendered-copy files cleaned in the sweep, NOT a tree-wide grep, which
 * returns many comment / identifier / log hits. Comments are stripped
 * before scanning so prose em dashes in JSDoc and inline comments (which
 * are not user-facing) do not trip the guard. The remaining content in
 * these files is string-literal / JSX copy.
 *
 * En dashes (U+2013) used in numeric ranges are intentionally NOT matched.
 */

import * as fs from 'fs';
import * as path from 'path';

// Curated copy sources (paths relative to the mobile/ root). These are the
// modules that carry user-facing strings cleaned in the brand sweep.
const COPY_SOURCES = [
  'src/constants/routineTemplates.ts',
  'src/constants/featureUnlock.ts',
  'src/constants/groupCategories.ts',
  'src/constants/brainHealthMapping.ts',
  'src/constants/milestoneTemplates.ts',
  'src/components/dashboard/dashboardInsights.ts',
  'src/engine/planMap.ts',
  'src/components/checkin/flow/PointerOfferStepView.tsx',
  // Four-Pillar IA Energy pillar screens (B-3b). User-facing hub + browse
  // list copy; guarded here so the pillar rollout can't reintroduce an
  // em dash / optim* in the rendered strings.
  'src/screens/Energy/EnergyHubScreen.tsx',
  'src/screens/Energy/EnergyBrowseListScreen.tsx',
  // Four-Pillar IA Focus pillar (B-3c). The Focus hub + rhythms screens, the
  // rhythms option labels, and the reworded focus reflection copy; guarded so
  // the pillar rollout can't reintroduce an em dash / optim* in these strings.
  'src/screens/Focus/FocusHubScreen.tsx',
  'src/screens/Focus/FocusRhythmsScreen.tsx',
  // IA restructure step 4a. The Practices hub's pillar card labels and
  // descriptors, guarded on the same terms as the pillar hubs they open. The
  // strings are [COPY GAP] placeholders today, which is exactly why the guard
  // goes on now: it is Jen's replacement copy that most needs it.
  'src/screens/practices/PracticesHubScreen.tsx',
  'src/screens/Focus/components/CenterFirstToggle.tsx',
  'src/constants/focusRhythms.ts',
  'src/constants/focusContent.ts',
  'src/components/checkin/flow/reflection.ts',
  // Four-Pillar IA Insights launch home (B-3d.6). The quiet dashboard look-back
  // card's user-facing copy; guarded so the rollout can't reintroduce an em dash
  // / optim* in its rendered strings.
  'src/components/dashboard/InsightsLookbackCard.tsx',
  // Launch conversion surfaces (Slice A). The post-onboarding paywall + the
  // Create Account screen; guarded so the outcomes-led copy can't regress an em
  // dash / optim* (and, below, brain-health-led framing).
  'src/screens/PaywallScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
  // Habit detail rebuild. The screen's own copy plus the module that composes
  // its descriptive reporting lines.
  'src/screens/HabitDetailScreen.tsx',
  'src/components/habits/habitHistory.ts',
  'src/components/habits/HabitWeekStrip.tsx',
  'src/components/habits/HabitFourWeekView.tsx',
  // The controlled habit taxonomy. Its nine labels are permanent user-facing
  // copy (rendered as chips on both the create sheet and the detail edit
  // modal), so they belong under the central guard rather than relying on a
  // local test that only knows today's rules.
  'src/constants/habitTaxonomy.ts',
  'src/components/habits/HabitCategorySelect.tsx',
];

// U+2014 EM DASH, built via char code so no literal em-dash byte lives in
// this source file (and so the guard never flags its own definition).
const EM_DASH = String.fromCharCode(0x2014);

const PROHIBITED_PATTERNS = [
  { label: 'em dash (U+2014)', re: new RegExp(EM_DASH) },
  {
    label: 'optim* (optimize / optimizer / optimization)',
    re: /optimi[sz](?:e|er|ation|ing)/i,
  },
];

// Survivors that are legitimately fine and must NOT fail the guard:
//  - 'evening-sleep-optimizer' is a persisted routine-template id; renaming
//    it would orphan existing user completion data. (The visible name was
//    changed to "Sleep Wind-Down"; only the stable id retains the old word.)
// The "Optimistic update" hook comments are not in scope here (those files
// are not copy sources) and would be comment-stripped regardless.
const ALLOWLIST_PATTERNS = [/evening-sleep-optimizer/];

const mobileRoot = path.resolve(__dirname, '../..');

// Blank out block comments while preserving newlines, so reported line
// numbers stay accurate.
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Drop a trailing line comment. The curated copy sources contain no "//"
// inside string literals, so a simple split is safe for this scoped set.
function stripLineComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

function isAllowlisted(line: string): boolean {
  return ALLOWLIST_PATTERNS.some((p) => p.test(line));
}

describe('Brand copy guard - em-dash + optim*', () => {
  COPY_SOURCES.forEach((relPath) => {
    const fullPath = path.join(mobileRoot, relPath);

    // Skip files that don't exist (defensive; all should exist).
    if (!fs.existsSync(fullPath)) return;

    describe(relPath, () => {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const lines = stripBlockComments(raw)
        .split('\n')
        .map(stripLineComment);

      PROHIBITED_PATTERNS.forEach(({ label, re }) => {
        it(`does not contain ${label}`, () => {
          const violations = lines
            .map((line, idx) => ({ line: line.trim(), num: idx + 1 }))
            .filter(({ line }) => re.test(line) && !isAllowlisted(line));

          if (violations.length > 0) {
            const details = violations
              .map((v) => `  Line ${v.num}: ${v.line}`)
              .join('\n');
            throw new Error(
              `Found prohibited ${label} in ${relPath}:\n${details}`
            );
          }
        });
      });
    });
  });
});

// Conversion + in-app headline surfaces additionally must stay OUTCOMES-LED.
// The June pivot moved brain health from headline to backbone, so these
// highest-intent / hero-copy screens must not reintroduce brain-health-led
// framing. Scoped to a curated list on purpose: a tree-wide "brain health" ban
// would trip legitimate BACKBONE education (e.g. brainHealthMapping.ts, the
// Learn/Masterclass explainer body). These surfaces carry acquisition or
// in-app *headline/hub/empty-state* copy where leading with "your brain" is the
// violation; explainer body copy that uses the backbone as the "why" is NOT
// listed here. Comments are stripped first, so a comment that mentions the
// retired framing to explain why it was removed does not trip the guard.
const OUTCOMES_LED_SURFACES = [
  'src/screens/PaywallScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
  // In-app pillar/reflection headline surfaces (v2 outcomes-led sweep). The
  // Energy hub (three-ways cards + Learn/Journal rows), the Journal intro
  // callout, and the Journal empty state are hub/headline copy, so they hold to
  // the same no-brain-health-led-framing rule as the conversion screens.
  'src/screens/Energy/EnergyHubScreen.tsx',
  'src/screens/JournalScreen.tsx',
  'src/components/journal/JournalEmptyState.tsx',
  // The habit detail screen. It led with brain health in two places before the
  // rebuild; both are gone and neither may come back.
  'src/screens/HabitDetailScreen.tsx',
];

const RETIRED_POSITIONING_PATTERNS = [
  { label: 'brain-health-led framing (brain health / brain-health)', re: /brain[-\s]?health/i },
  { label: 'brain-aligned framing', re: /brain[-\s]?aligned/i },
  { label: 'brain-as-headline phrasing', re: /how your brain\b|supporting your brain/i },
];

// Habit surfaces additionally must state NO CLINICAL CLAIM. Voice & Tone §5
// bans clinical claims outright; §4 permits only conditional framing. The habit
// detail screen shipped two as flat fact — "consistent focus habits strengthen
// prefrontal cortex pathways over time" and "even 5 minutes of focused practice
// builds your brain's attention networks" — from a twenty-string table in
// intentions.ts. The table is deleted; this guard is what stops a replacement
// being written.
//
// Scoped to the habit surfaces on purpose. A tree-wide ban would trip the
// legitimate BACKBONE education in brainHealthMapping.ts and the Learn content,
// which is explainer body copy, not a claim attached to a user's own habit.
// Comments are stripped first, so the notes explaining what was removed (and
// this list itself) cannot trip it.
const NO_CLINICAL_CLAIM_SOURCES = [
  'src/screens/HabitDetailScreen.tsx',
  'src/components/habits/habitHistory.ts',
  'src/components/habits/HabitWeekStrip.tsx',
  'src/components/habits/HabitFourWeekView.tsx',
  'src/components/habits/IntentionEditSheet.tsx',
  // Where the deleted table lived.
  'src/constants/intentions.ts',
];

const CLINICAL_CLAIM_PATTERNS = [
  {
    label: 'brain-anatomy mechanism',
    re: /prefrontal|cortex|neural (pathway|loop|network)|attention network|neuroplastic|synap|dopamine|serotonin|cortisol/i,
  },
  { label: 'rewiring claim', re: /rewir(e|es|ed|ing)/i },
  {
    label: 'cognitive-benefit claim',
    re: /builds? your brain|strengthens? your brain|cognitive (improvement|gain|benefit)/i,
  },
];

describe('Habit surfaces state no clinical claim', () => {
  NO_CLINICAL_CLAIM_SOURCES.forEach((relPath) => {
    const fullPath = path.join(mobileRoot, relPath);
    if (!fs.existsSync(fullPath)) return;

    describe(relPath, () => {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const lines = stripBlockComments(raw)
        .split('\n')
        .map(stripLineComment);

      CLINICAL_CLAIM_PATTERNS.forEach(({ label, re }) => {
        it(`does not contain a ${label}`, () => {
          const violations = lines
            .map((line, idx) => ({ line: line.trim(), num: idx + 1 }))
            .filter(({ line }) => re.test(line));

          if (violations.length > 0) {
            const details = violations
              .map((v) => `  Line ${v.num}: ${v.line}`)
              .join('\n');
            throw new Error(
              `Found prohibited ${label} in ${relPath}:\n${details}`
            );
          }
        });
      });
    });
  });
});

// The habit detail screen must not reintroduce coral. Colors.error (#D97A6E) is
// reserved for genuine errors; removing a habit you chose is an intentional
// action. Checked at the source rather than in a render, because a coral style
// on a state the default render never reaches would pass a render assertion.
describe('Habit detail screen uses no error color', () => {
  const raw = fs.readFileSync(
    path.join(mobileRoot, 'src/screens/HabitDetailScreen.tsx'),
    'utf-8'
  );
  const lines = stripBlockComments(raw).split('\n').map(stripLineComment);

  it.each([
    ['Colors.error', /Colors\.error/],
    ['the coral hex', /D97A6E/i],
    ['any red or amber literal', /#(FF|F4|E5|D9)[0-9A-F]{0,2}(00|3B|43)/i],
  ])('does not reference %s', (_label, re) => {
    expect(lines.filter((line) => re.test(line))).toEqual([]);
  });
});

describe('Conversion surfaces stay outcomes-led (no brain-health-led framing)', () => {
  OUTCOMES_LED_SURFACES.forEach((relPath) => {
    const fullPath = path.join(mobileRoot, relPath);
    if (!fs.existsSync(fullPath)) return;

    describe(relPath, () => {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const lines = stripBlockComments(raw)
        .split('\n')
        .map(stripLineComment);

      RETIRED_POSITIONING_PATTERNS.forEach(({ label, re }) => {
        it(`does not contain ${label}`, () => {
          const violations = lines
            .map((line, idx) => ({ line: line.trim(), num: idx + 1 }))
            .filter(({ line }) => re.test(line));

          if (violations.length > 0) {
            const details = violations
              .map((v) => `  Line ${v.num}: ${v.line}`)
              .join('\n');
            throw new Error(
              `Found prohibited ${label} in ${relPath}:\n${details}`
            );
          }
        });
      });
    });
  });
});
