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

// Conversion surfaces (the paywall + Create Account screen) additionally must
// stay OUTCOMES-LED. The June pivot moved brain health from headline to
// backbone, so these highest-intent screens must not reintroduce brain-health-
// led framing. Scoped to just these two files on purpose: a tree-wide "brain
// health" ban would trip legitimate uses (e.g. brainHealthMapping.ts). Comments
// are stripped first, so a comment that mentions the retired framing to explain
// why it was removed does not trip the guard.
const OUTCOMES_LED_SURFACES = [
  'src/screens/PaywallScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
];

const RETIRED_POSITIONING_PATTERNS = [
  { label: 'brain-health-led framing (brain health / brain-health)', re: /brain[-\s]?health/i },
  { label: 'brain-aligned framing', re: /brain[-\s]?aligned/i },
  { label: 'brain-as-headline phrasing', re: /how your brain\b|supporting your brain/i },
];

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
