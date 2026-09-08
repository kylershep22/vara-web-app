/**
 * Route names for the progressive onboarding arc (V3).
 *
 * Local to the arc rather than added to navigation/routes.ts: these ten names
 * live inside the OnboardingStack, which is a separate navigator from the app
 * stack that ROUTES serves. Nothing outside this directory targets them.
 *
 * The arc is linear. Screen order here IS the order, and the step indicator is
 * derived from it (see V3_TOTAL_STEPS / v3StepNumber) so inserting a screen
 * cannot leave the "3 of 10" copy stale.
 *
 * WHAT V3_ORDER DOES NOT DRIVE: the navigate chain. Each screen names its own
 * successor literally (`navigation.navigate(V3_ROUTES.X)`), so inserting a
 * screen here ALSO means repointing the one before it. Nothing enforces that
 * the two agree — the step numbers would stay correct while the arc skipped the
 * new screen entirely.
 *
 * SLICE 4 INSERTED `Route` AT POSITION 3 AND PROVED IT WITH AN ARC TEST, not a
 * registration test. Asserting that a screen is registered, or that it appears
 * in V3_ORDER, would have passed on exactly the broken arc this comment warns
 * about: the step numbers renumber themselves off V3_ORDER while
 * Destination.onPrimary still points at Why. The test that catches it walks
 * step 2 and asserts where the CTA actually lands. See
 * __tests__/arc.test.tsx.
 */

export const V3_ROUTES = {
  ColdOpen: 'OnboardingV3ColdOpen',
  /**
   * A1. Renamed from `Outcome` in journey slice 4, because it now picks a
   * DestinationKey and not an OutcomeKey. The two unions differ (`calm` vs
   * `stress`) and three slices of work went into keeping them apart; a screen
   * whose name says outcome while its state says destination is how that comes
   * back. Route names are internal to this stack and nothing persists them, so
   * the rename costs nothing.
   */
  Destination: 'OnboardingV3Destination',
  /** A2. The route explanation. New in journey slice 4. */
  Route: 'OnboardingV3Route',
  Why: 'OnboardingV3Why',
  Capacity: 'OnboardingV3Capacity',
  Floor: 'OnboardingV3Floor',
  WeekStart: 'OnboardingV3WeekStart',
  FirstWin: 'OnboardingV3FirstWin',
  Reminder: 'OnboardingV3Reminder',
  Done: 'OnboardingV3Done',
} as const;

export type V3RouteName = (typeof V3_ROUTES)[keyof typeof V3_ROUTES];

/** The arc in order. The single source of both the stack order and the step numbers. */
export const V3_ORDER: readonly V3RouteName[] = [
  V3_ROUTES.ColdOpen,
  V3_ROUTES.Destination,
  V3_ROUTES.Route,
  V3_ROUTES.Why,
  V3_ROUTES.Capacity,
  V3_ROUTES.Floor,
  V3_ROUTES.WeekStart,
  V3_ROUTES.FirstWin,
  V3_ROUTES.Reminder,
  V3_ROUTES.Done,
];

export const V3_TOTAL_STEPS = V3_ORDER.length;

/** 1-based position of a screen in the arc, for the step indicator. */
export function v3StepNumber(route: V3RouteName): number {
  return V3_ORDER.indexOf(route) + 1;
}
