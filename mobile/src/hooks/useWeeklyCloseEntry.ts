/**
 * The entry to the weekly close (spec 8), for Home.
 *
 * Ported from WeeklyTodayScreen.tsx:256-265. It is a hook rather than an inline
 * handler for one reason: the ordering below is the load-bearing part, and a
 * handler buried in a screen that needs a navigator, an auth context and a
 * dozen Firestore mocks to render is a handler nobody tests.
 *
 * FIRE-ON-TAP, NOT FIRE-AFTER-SUCCESS, and it must stay that way. Every other
 * event in the weekly loop records something that landed; this one records an
 * INTENT, and its whole value is the gap between it and `weekly_close` — a tap
 * with no close is the abandon signal, and there is no other way to see one.
 * Moving it after a write would delete the only thing it measures.
 *
 * The navigation is the caller's, so this stays testable without a navigator
 * and there is one place to look when Home opens the close.
 */
import { useCallback } from 'react';

import { logEvent } from '../services/firebase/analyticsEvents.service';

export function useWeeklyCloseEntry(
  uid: string | undefined,
  navigate: () => void
): () => void {
  return useCallback(() => {
    if (uid) {
      try {
        logEvent(uid, 'weekly_close_entry', {});
      } catch {
        // Never the user's problem. A telemetry defect may not be the reason a
        // user cannot close their week.
      }
    }
    navigate();
  }, [uid, navigate]);
}
