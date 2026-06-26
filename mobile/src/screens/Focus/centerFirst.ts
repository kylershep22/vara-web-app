// Pure decision helper for the Focus timer's Begin/play tap (B-3c commit 5).
//
// The timer setup has an opt-in "Center first" row. When it is ON and a
// centering practice is still available for this session, the first Begin tap
// should launch the pre-focus box breathing practice rather than starting the
// timer. Extracted as a pure function so the ON (center) vs OFF (start directly)
// decision is unit-testable without mounting the timer.

export type TimerPlayState =
  | 'idle'
  | 'running'
  | 'break_running'
  | 'paused'
  | string;

export type PlayAction = 'center' | 'start' | 'pause' | 'resume' | 'noop';

export interface PlayActionInput {
  // The user's persisted "Center first" choice, controlling the setup row.
  centerFirst: boolean;
  // Whether a centering practice is still launchable this session (false once
  // the user has already centered, so a second block starts directly).
  canCenter: boolean;
}

export function resolvePlayAction(
  state: TimerPlayState,
  { centerFirst, canCenter }: PlayActionInput
): PlayAction {
  if (state === 'idle') {
    return centerFirst && canCenter ? 'center' : 'start';
  }
  if (state === 'running' || state === 'break_running') return 'pause';
  if (state === 'paused') return 'resume';
  return 'noop';
}
