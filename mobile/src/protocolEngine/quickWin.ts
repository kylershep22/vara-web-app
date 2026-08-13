/**
 * Week-1 quick-win rule (spec 6.3).
 *
 * Time-to-felt-effect varies enormously: an extended exhale lands in minutes,
 * a routine takes weeks. So every week-1 protocol appends one same-session
 * physical practice regardless of outcome, to prove the app works before the
 * calendar has to. Dropped from week 2 on.
 *
 * The quick win is represented as explicit state (`quickWinActive`), not by
 * appending to `supportingPracticeIds`. That list means "optional supporting
 * practices"; the quick win is a mandatory same-session step, and collapsing
 * the two would lose the distinction the Today screen has to render.
 * The practice id itself is already on the protocol as `quickWinPracticeId`.
 *
 * Pure: `weekNumber` is injected, never derived from the clock, and the input
 * protocol is never mutated.
 */
import type { ResolvedProtocolVariant, ProtocolVariant } from './types';

export const QUICK_WIN_WEEK = 1;

export function applyQuickWin(
  protocol: ProtocolVariant,
  weekNumber: number
): ResolvedProtocolVariant {
  return { ...protocol, quickWinActive: weekNumber === QUICK_WIN_WEEK };
}
