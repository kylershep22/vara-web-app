/**
 * Route names for the progressive onboarding arc (V3).
 *
 * Local to the arc rather than added to navigation/routes.ts: these eight names
 * live inside the OnboardingStack, which is a separate navigator from the app
 * stack that ROUTES serves. Nothing outside this directory targets them.
 *
 * The arc is linear. Screen order here IS the order, and the step indicator is
 * derived from it (see V3_TOTAL_STEPS / v3StepNumber) so inserting a screen
 * cannot leave the "3 of 8" copy stale.
 */

export const V3_ROUTES = {
  ColdOpen: 'OnboardingV3ColdOpen',
  Outcome: 'OnboardingV3Outcome',
  Why: 'OnboardingV3Why',
  Capacity: 'OnboardingV3Capacity',
  Floor: 'OnboardingV3Floor',
  FirstWin: 'OnboardingV3FirstWin',
  Reminder: 'OnboardingV3Reminder',
  Done: 'OnboardingV3Done',
} as const;

export type V3RouteName = (typeof V3_ROUTES)[keyof typeof V3_ROUTES];

/** The arc in order. The single source of both the stack order and the step numbers. */
export const V3_ORDER: readonly V3RouteName[] = [
  V3_ROUTES.ColdOpen,
  V3_ROUTES.Outcome,
  V3_ROUTES.Why,
  V3_ROUTES.Capacity,
  V3_ROUTES.Floor,
  V3_ROUTES.FirstWin,
  V3_ROUTES.Reminder,
  V3_ROUTES.Done,
];

export const V3_TOTAL_STEPS = V3_ORDER.length;

/** 1-based position of a screen in the arc, for the step indicator. */
export function v3StepNumber(route: V3RouteName): number {
  return V3_ORDER.indexOf(route) + 1;
}
