/**
 * Route names for the Remove capture flow (slice 3c-i).
 *
 * NAMESPACED with a `RemoveCapture` prefix so none of them can collide with the
 * app-wide ROUTES registry, which already carries two near-misses this project
 * has had to reason about (`Practices` vs `PillarPractices`, `Learn` vs
 * `PillarLearn`).
 *
 * PROGRESS-FREE. There is no step count and no total: the flow branches, so the
 * five routes are not five steps for anybody. A "3 of 5" on a path that takes
 * three screens would be a lie the scaffold tells for free.
 */
export const REMOVE_CAPTURE_ROUTES = {
  Identify: 'RemoveCaptureIdentify',
  Clarify: 'RemoveCaptureClarify',
  Sleep: 'RemoveCaptureSleep',
  Timing: 'RemoveCaptureTiming',
  FirstMove: 'RemoveCaptureFirstMove',
  Support: 'RemoveCaptureSupport',
} as const;

export type RemoveCaptureRoute =
  (typeof REMOVE_CAPTURE_ROUTES)[keyof typeof REMOVE_CAPTURE_ROUTES];
