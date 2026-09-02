/**
 * The landing guard for Home, journey-aware (journey slice 2).
 *
 * A WRAPPER, NOT A REPLACEMENT. useWeeklyLanding is always called and its
 * result is always available; this hook decides whether to serve that answer or
 * a journey answer on top of it. With JOURNEY_IA off it returns the weekly
 * landing's own fields unchanged, so the flag-off path is the original code
 * doing the original reads in the original order rather than a second
 * implementation that has to be kept honest.
 *
 * WHY useWeeklyLanding RUNS EVEN UNDER THE FLAG. Three reasons, and none of
 * them is inertia:
 *
 *   1. THE FLOOR GATE IS PRESERVED EXACTLY. A user with no floor commitment
 *      still resolves to 'floor' and is still pushed to the floor screen. That
 *      rule is not restated here; it arrives already applied.
 *   2. THE CYCLE IS STILL NEEDED FOR RENDER. The weekly close entry and the
 *      hero's week-summary line both read a WeeklyCycle, and neither is being
 *      touched this slice. Carrying the cycle through is what keeps them
 *      working while the DAY stops depending on it.
 *   3. Rung (d) of the resolver falls back to exactly this answer.
 *
 * THE 'open' TARGET IS NOT EMITTED UNDER THE FLAG, and this is the one place
 * behavior genuinely differs. A journey user whose week has expired stays on
 * Today instead of being pushed into the weekly open, because the journey is
 * now what says where they are. The consequence, stated plainly so the device
 * walk is not surprised by it: Home neither pushes to the weekly open nor
 * renders the standing OpenYourWeekCard while the flag is on. That is the
 * intended end state; it is behind a flag because it is a one-way door for
 * anyone mid-week.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { JOURNEY_IA } from '../constants/dashboardConfig';
import { resolveJourney, type PhaseContext } from '../journey/resolveJourney';
import { useWeeklyLanding } from './useWeeklyLanding';
import type { WeeklyEntryTarget } from '../screens/weekly/weeklyEntry';
import type { WeeklyCycle } from '../types/models';

export interface JourneyLanding {
  /** null while the reads are in flight, and on failure. */
  target: WeeklyEntryTarget | null;
  /**
   * The cycle behind the answer, when there is one.
   *
   * Still populated under the flag, for the close entry and the hero's summary
   * line. The DAY no longer reads it: that comes from `phase`.
   */
  cycle: WeeklyCycle | null;
  /** The journey context behind a 'today' answer. null on every legacy path. */
  phase: PhaseContext | null;
  loading: boolean;
  failed: boolean;
  refresh: () => void;
}

export function useJourneyLanding(uid: string | undefined): JourneyLanding {
  const weekly = useWeeklyLanding(uid);

  const [phase, setPhase] = useState<PhaseContext | null>(null);
  // null means "the resolver has not answered yet for this pass", which is a
  // different state from 'legacy' and must not render as one: treating it as
  // legacy for a frame would flash the weekly surface at a journey user.
  const [resolved, setResolved] = useState<'today' | 'legacy' | null>(null);

  // Guards against a resolved read landing after the uid changed or the screen
  // unmounted, matching useWeeklyLanding's own guard.
  const activeRef = useRef(true);

  // The weekly answer this resolver pass was run against. The resolver depends
  // on it: 'floor' short-circuits before the ladder runs at all.
  const weeklyTarget = weekly.target;

  useEffect(() => {
    activeRef.current = true;

    // Flag off, no user, or the weekly guard has not answered yet: nothing to
    // resolve. Also short-circuits 'floor', so the floor gate wins outright and
    // no journey state is created for a user who has not set a floor.
    if (!JOURNEY_IA || !uid || weeklyTarget === null || weeklyTarget === 'floor') {
      setPhase(null);
      setResolved(null);
      return () => {
        activeRef.current = false;
      };
    }

    (async () => {
      const result = await resolveJourney(uid);
      if (!activeRef.current) return;
      if (result.target === 'today') {
        setPhase(result.phase);
        setResolved('today');
      } else {
        setPhase(null);
        setResolved('legacy');
      }
    })();

    return () => {
      activeRef.current = false;
    };
    // `weekly.attempt` is not exposed, so a refresh re-runs this through the
    // weekly target flipping to null and back while its own reads are in
    // flight. That is why `refresh` below drives the weekly hook rather than a
    // counter of this hook's own.
  }, [uid, weeklyTarget]);

  const refresh = useCallback(() => {
    weekly.refresh();
  }, [weekly]);

  if (!JOURNEY_IA) {
    // VERBATIM DELEGATION. Same object fields, same values, plus a null phase
    // that no flag-off call site reads.
    return {
      target: weekly.target,
      cycle: weekly.cycle,
      phase: null,
      loading: weekly.loading,
      failed: weekly.failed,
      refresh: weekly.refresh,
    };
  }

  // The floor gate, unchanged and ahead of everything.
  if (weekly.target === 'floor') {
    return {
      target: 'floor',
      cycle: null,
      phase: null,
      loading: weekly.loading,
      failed: weekly.failed,
      refresh,
    };
  }

  if (resolved === 'today' && phase) {
    return {
      target: 'today',
      // Carried for the close entry and the summary line. Null when the week
      // has expired, which the render gates on rather than assuming.
      cycle: weekly.cycle,
      phase,
      loading: weekly.loading,
      failed: weekly.failed,
      refresh,
    };
  }

  if (resolved === 'legacy') {
    return {
      target: weekly.target,
      cycle: weekly.cycle,
      phase: null,
      loading: weekly.loading,
      failed: weekly.failed,
      refresh,
    };
  }

  // The resolver has not answered yet. Report loading rather than a target:
  // Home renders its ordinary content and nothing routes on an unknown state,
  // which is the same rule useWeeklyLanding applies to a failed read.
  return {
    target: null,
    cycle: null,
    phase: null,
    loading: true,
    failed: weekly.failed,
    refresh,
  };
}
