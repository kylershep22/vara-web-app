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
  //   PillarFocus          ← the Practices hub's "Focus & Time" card (step 4a)
  //   PillarEnergy         ← the Practices hub's "Energy" card, and
  //                          NAV_TARGETS.browseContent
  //   PillarTime           ← NAV_TARGETS.plan (8 call sites), reached from the
  //                          hub's "Routines" card since 4b-i
  //   PillarStressRecovery ← the Practices hub's fourth card, and nowhere else
  //                          (step 4b-ii-a)
  //   FocusRhythms         ← the Focus hub's secondary row, and nowhere else
  //   FocusDayBlocks       ← the Focus hub's "Time blocking" card, which stopped
  //                          being a coming-soon placeholder in TB-1b
  //   FocusTasks           ← the Focus hub's "Task batching" card, the LAST
  //                          coming-soon placeholder, swapped in TB-2b
  it.each([
    ['PillarFocus'],
    ['PillarEnergy'],
    ['PillarTime'],
    ['PillarStressRecovery'],
    ['FocusRhythms'],
    ['FocusDayBlocks'],
    ['FocusTasks'],
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

  it('imports the day-view screen it registers', () => {
    // Same guard as the two below, for the same failure mode. TB-1b makes the
    // Focus hub's Time blocking card live, so an absent import here is a card
    // that navigates to a route no navigator mounts.
    expect(NAVIGATOR_SOURCE).toMatch(/import \{[^}]*DayBlocksScreen[^}]*\} from/);
  });

  it('imports the tasks screen it registers', () => {
    // Same guard, same failure mode: TB-2b makes the Focus hub's Task batching
    // card live, so an absent import here is a card that navigates to a route
    // no navigator mounts.
    expect(NAVIGATOR_SOURCE).toMatch(/import \{[^}]*CapturedTasksScreen[^}]*\} from/);
  });

  it('registers the tasks screen UNGATED, on the same precedent', () => {
    // Identical reasoning to the day view below: the only parent chain exists
    // solely in the four-tab IA, so a FOUR_PILLAR_IA gate would be dead code.
    // Asserted separately because the nearest neighbouring registrations
    // (FocusRhythms, EnergyBrowse) ARE gated, and copying a neighbour is the
    // obvious way to add a screen here.
    const at = NAVIGATOR_SOURCE.indexOf('name={ROUTES.FocusTasks}');
    expect(at).toBeGreaterThan(-1);

    const before = NAVIGATOR_SOURCE.slice(0, at);
    const lastGateOpen = before.lastIndexOf('{FOUR_PILLAR_IA && (');
    const gateIsClosed =
      lastGateOpen === -1 || before.slice(lastGateOpen).includes(')}');

    expect(gateIsClosed).toBe(true);
  });

  it('registers the day view UNGATED, on the Stress Recovery precedent', () => {
    // FocusRhythms and EnergyBrowse sit inside `{FOUR_PILLAR_IA && (...)}`
    // because they predate the four-tab IA. This one does not: its only parent
    // chain exists solely in that IA, so a gate would be dead code. Asserted
    // because "copy the neighbouring registration" is the obvious way to add a
    // screen here, and the nearest neighbour is gated.
    const at = NAVIGATOR_SOURCE.indexOf('name={ROUTES.FocusDayBlocks}');
    expect(at).toBeGreaterThan(-1);

    const before = NAVIGATOR_SOURCE.slice(0, at);
    const lastGateOpen = before.lastIndexOf('{FOUR_PILLAR_IA && (');
    // Either nothing before us opens a gate, or whichever one did has already
    // closed. A registration sitting INSIDE a gate would have an open one with
    // no `)}` between it and this Screen, which is what fails here.
    const gateIsClosed =
      lastGateOpen === -1 || before.slice(lastGateOpen).includes(')}');

    expect(gateIsClosed).toBe(true);
  });

  it('imports the Stress Recovery screen it registers', () => {
    // Same guard as the Focus one above, for the same failure mode: a
    // registration whose component import went missing is the step-2 state that
    // cost a whole slice.
    expect(NAVIGATOR_SOURCE).toMatch(
      /import \{[^}]*StressRecoveryScreen[^}]*\} from/
    );
  });

  it('never grew a PillarRoutines route', () => {
    // The other half of the old "no Routines or Stress Recovery route yet"
    // guard, and the half that is still true. Routines is reached by REUSING
    // PillarTime (NAV_TARGETS.plan) because the routine builder already lives
    // there — a pillar card does not imply a new route key, and inventing
    // PillarRoutines would mean a second home for the same builder.
    //
    // Stress Recovery's half of that guard was retired in 4b-ii-a: its key now
    // exists, asserted registered in the it.each above.
    expect(Object.keys(ROUTES)).not.toContain('PillarRoutines');
  });
});
