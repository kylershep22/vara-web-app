/**
 * Pillar route REGISTRATION guard — IA restructure step 4a.
 *
 * There was a hole here, and it cost a whole step. Between step 2 and step 4a,
 * ROUTES.PillarFocus existed, FocusHubScreen existed, its 27 unit tests passed,
 * and the screen was registered in no navigator at all — so it, and
 * FocusRhythmsScreen behind it, were unreachable in the shipped app. Nothing in
 * the suite could see that: navTargets.test.ts checks NAV_TARGETS values against
 * the ROUTES *object*, which is a table of strings and says nothing about what
 * any navigator mounts.
 *
 * This closes it for the pillar routes specifically: a route that something
 * navigates to must be a route AppNavigator actually registers.
 *
 * Asserted by reading AppNavigator's SOURCE rather than rendering it. Rendering
 * it pulls auth, subscriptions, RevenueCat and the onboarding tree, and the
 * navigator only mounts one branch of the auth state machine at a time, so a
 * render-based check would have to drive it into the signed-in-and-onboarded
 * state before it could see the AppStack at all. The source is the honest
 * artifact for "is there a Screen element for this name", and this file follows
 * the precedent set by brandCopyGuard.test.ts, which reads sources the same way.
 * The complementary behavioural proof — that pressing the card actually lands on
 * the screen — is in screens/practices/__tests__/practicesToFocus.nav.test.tsx.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { ROUTES } from '../routes';

const NAVIGATOR_SOURCE = readFileSync(
  join(__dirname, '..', 'AppNavigator.tsx'),
  'utf8'
);

/**
 * True when AppNavigator contains a Screen whose name is this route, written
 * either as `name={ROUTES.Foo}` or as the literal `name="Foo"`. Both forms are
 * in use in that file.
 */
function isRegistered(routeKey: keyof typeof ROUTES): boolean {
  const value = ROUTES[routeKey];
  return (
    NAVIGATOR_SOURCE.includes(`name={ROUTES.${routeKey}}`) ||
    NAVIGATOR_SOURCE.includes(`name="${value}"`)
  );
}

describe('pillar routes are registered, not just named', () => {
  // Every pillar destination something navigates to today.
  //   PillarFocus  ← the Practices hub's "Focus & Time" card (step 4a)
  //   PillarEnergy ← the Practices hub's "Energy" card, and NAV_TARGETS.browseContent
  //   PillarTime   ← NAV_TARGETS.plan (8 call sites)
  //   FocusRhythms ← the Focus hub's secondary row, and nowhere else
  it.each([
    ['PillarFocus'],
    ['PillarEnergy'],
    ['PillarTime'],
    ['FocusRhythms'],
  ] as const)('AppNavigator registers %s', (routeKey) => {
    expect(isRegistered(routeKey)).toBe(true);
  });

  it('registers the two tab roots the four-tab IA opens on', () => {
    expect(isRegistered('PillarPractices')).toBe(true);
    expect(isRegistered('PillarLearn')).toBe(true);
  });

  it('imports the Focus hub component it registers', () => {
    // The step-2 state was an import deliberately withheld with a comment in its
    // place. If that ever recurs, the registration above would not compile —
    // but this states the intent directly, next to the route it belongs to.
    expect(NAVIGATOR_SOURCE).toMatch(/import \{[^}]*FocusHubScreen[^}]*\} from/);
  });

  it('does not register a Routines or Stress Recovery pillar route yet', () => {
    // 4a ships a two-card hub. These pillars land in 4b, with their pages. If a
    // route key for either appears before then, the no-dead-ends rule slipped.
    expect(Object.keys(ROUTES)).not.toContain('PillarRoutines');
    expect(Object.keys(ROUTES)).not.toContain('PillarStressRecovery');
  });
});
