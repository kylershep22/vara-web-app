/**
 * Route names for the Remove capture flow (slices 3c-i and 3c-ii).
 *
 * NAMESPACED with a `RemoveCapture` prefix so none of them can collide with the
 * app-wide ROUTES registry, which already carries two near-misses this project
 * has had to reason about (`Practices` vs `PillarPractices`, `Learn` vs
 * `PillarLearn`).
 *
 * PROGRESS-FREE. There is no step count and no total: the flow branches, so the
 * routes are not steps for anybody. A "3 of 5" on a path that takes three
 * screens would be a lie the scaffold tells for free, and 3c-ii widened the
 * spread further: only a behavioral capture with a named slot sees Replacement,
 * so two users answering the same number of questions can end on different
 * screens.
 */
export const REMOVE_CAPTURE_ROUTES = {
  Identify: 'RemoveCaptureIdentify',
  Clarify: 'RemoveCaptureClarify',
  Sleep: 'RemoveCaptureSleep',
  Timing: 'RemoveCaptureTiming',
  FirstMove: 'RemoveCaptureFirstMove',
  Replacement: 'RemoveCaptureReplacement',
  Support: 'RemoveCaptureSupport',
} as const;

export type RemoveCaptureRoute =
  (typeof REMOVE_CAPTURE_ROUTES)[keyof typeof REMOVE_CAPTURE_ROUTES];
