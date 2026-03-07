/**
 * Brand Compliance Tests
 * Lightweight regex checks against screen source files to catch
 * prohibited copy being reintroduced.
 *
 * Prohibited patterns:
 * - "streak" (as a visible label/count — variable names are OK)
 * - "confetti"
 * - "Unlock Your"
 * - "Subscribe Now"
 * - "Don't break"
 * - "Don't miss"
 * - "Limited time"
 * - "Act now"
 */

import * as fs from 'fs';
import * as path from 'path';

const PROHIBITED_PATTERNS = [
  // Match user-visible strings — skip variable names and comments about removal
  /['"`].*streak.*['"`]/i,
  /confetti/i,
  /Unlock Your/i,
  /Subscribe Now/i,
  /Don't break/i,
  /Don't miss/i,
  /Limited time/i,
  /Act now/i,
];

// Allow-list for patterns that are OK (variable names, comments about compliance, etc.)
const ALLOWLIST_PATTERNS = [
  /streak.*:/,          // Object property names like `streak: 0`
  /ConfettiOverlay/,    // Component reference in comments about replacement
  /Replaces.*Confetti/i, // Comments about replacing confetti
  /streakCount/,        // Variable names
  /streak_/,            // Snake_case variable names
  /getConsistencyLabel/, // Function that replaces streak terminology
  /streak,/,            // Object destructuring
];

const SCREEN_FILES = [
  'src/screens/DashboardScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/PaywallScreen.tsx',
  'src/screens/HabitsScreen.tsx',
  'src/screens/GoalsScreen.tsx',
  'src/screens/InsightsScreen.tsx',
  'src/screens/JournalScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/WelcomeScreen.tsx',
  'src/components/celebrations/QuietFinish.tsx',
  'src/components/celebrations/StreakMilestoneModal.tsx',
  'src/components/celebrations/AnimatedCheckbox.tsx',
];

const mobileRoot = path.resolve(__dirname, '../..');

function isAllowlisted(line: string): boolean {
  return ALLOWLIST_PATTERNS.some((pat) => pat.test(line));
}

describe('Brand compliance — prohibited copy', () => {
  SCREEN_FILES.forEach((relPath) => {
    const fullPath = path.join(mobileRoot, relPath);

    // Skip files that don't exist yet
    if (!fs.existsSync(fullPath)) return;

    describe(relPath, () => {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      PROHIBITED_PATTERNS.forEach((pattern) => {
        it(`does not contain prohibited pattern: ${pattern.source}`, () => {
          const violations = lines
            .map((line, idx) => ({ line: line.trim(), num: idx + 1 }))
            .filter(({ line }) => pattern.test(line) && !isAllowlisted(line));

          if (violations.length > 0) {
            const details = violations
              .map((v) => `  Line ${v.num}: ${v.line}`)
              .join('\n');
            fail(
              `Found prohibited pattern ${pattern} in ${relPath}:\n${details}`
            );
          }
        });
      });
    });
  });
});
