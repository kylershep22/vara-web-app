/**
 * The weekly entry guard, resolved ON HOME instead of on a route.
 *
 * WHY THIS EXISTS. WeeklyEntryScreen answers the same question by fetching two
 * facts and then `replace`-ing to one of three routes. Home cannot be replaced
 * into: it is a TAB inside FivePillarTabs, not a stack screen, so the 'today'
 * answer has to be served by rendering rather than by navigating. This hook
 * performs the identical two reads (see WeeklyEntryScreen.tsx:72-75), applies
 * the identical rule, and reports the answer to Home.
 *
 * THE RULE IS NOT REIMPLEMENTED HERE. resolveWeeklyEntry is imported and called
 * unchanged. It is a pure function of its inputs, which is exactly what lets it
 * serve a screen and a tab without either owning it. Do not inline its logic;
 * two copies of a routing rule is how the tab and the route start disagreeing
 * about which week the user is in.
 *
 * NAVIGATION SIDE EFFECTS ARE THE CALLER'S. This hook returns a target and the
 * cycle it read; it never navigates. Keeping the push in the screen means the
 * hook stays testable without a navigator and there is exactly one place to
 * look when Home sends someone to the floor screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { getFloorCommitment } from '../services/firebase/userPrivate.service';
import { getLatestWeeklyCycle } from '../services/firebase/weeklyCycle.service';
import {
  resolveWeeklyEntry,
  type WeeklyEntryTarget,
} from '../screens/weekly/weeklyEntry';
import type { WeeklyCycle } from '../types/models';
import { toIsoDate } from '../utils/weekStart';
import { logger } from '../utils/logger';

export interface WeeklyLanding {
  /**
   * null while the reads are in flight, and on failure. Home renders its
   * ordinary content in both cases rather than guessing a target.
   */
  target: WeeklyEntryTarget | null;
  /** The cycle behind a 'today' answer. null for the other targets. */
  cycle: WeeklyCycle | null;
  loading: boolean;
  /**
   * A read failed. Home does NOT route on this: sending a user to the weekly
   * open on an unknown state would let them open a second cycle for a week they
   * have already opened, which is the same reasoning WeeklyEntryScreen applies
   * when it stops and offers a retry instead of guessing.
   */
  failed: boolean;
  /** Re-run the reads. Used on screen focus and after a retry. */
  refresh: () => void;
}

export function useWeeklyLanding(uid: string | undefined): WeeklyLanding {
  const [target, setTarget] = useState<WeeklyEntryTarget | null>(null);
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Guards against a resolved read landing after the uid changed or the screen
  // unmounted, which would otherwise route a signed-out user.
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    if (!uid) {
      setTarget(null);
      setCycle(null);
      setLoading(false);
      return () => {
        activeRef.current = false;
      };
    }

    setLoading(true);
    setFailed(false);

    (async () => {
      try {
        const floorCommitment = await getFloorCommitment(uid);
        // Skip the cycle read entirely when there is no floor: the answer is
        // already 'floor' and the read would be thrown away. Same short-circuit
        // the entry screen makes.
        const latest = floorCommitment ? await getLatestWeeklyCycle(uid) : null;
        if (!activeRef.current) return;

        const resolved = resolveWeeklyEntry({
          floorCommitment,
          latestCycleWeekStart: latest?.weekStart ?? null,
          todayIso: toIsoDate(new Date()),
        });

        setTarget(resolved);
        // Carried only for 'today'. The other two targets navigate away, and a
        // stale cycle held behind a screen the user is leaving is a trap.
        setCycle(resolved === 'today' ? latest : null);
        setLoading(false);
      } catch (error) {
        logger.error('[useWeeklyLanding] resolve failed:', error);
        if (!activeRef.current) return;
        setTarget(null);
        setCycle(null);
        setFailed(true);
        setLoading(false);
      }
    })();

    return () => {
      activeRef.current = false;
    };
  }, [uid, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  return { target, cycle, loading, failed, refresh };
}
