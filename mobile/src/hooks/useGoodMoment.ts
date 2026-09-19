/**
 * Good moments — the sheet's state machine and its one write (journey slice 8).
 *
 * WHY A HOOK RATHER THAN STATE ON THE SCREEN. `DashboardScreen` is already the
 * largest file in `src/` and over the `max-lines` warn threshold. Putting a
 * write, a four-state machine and a timer directly into it would add all three
 * to a file nobody can hold in their head, for a feature that touches nothing
 * else on the screen. `useTodayCard` established the shape: the screen asks for
 * a handle and renders it.
 *
 * IT OWNS THE TIMER, NOT THE SHEET. The acknowledgment has to outlive the write
 * and then close the surface that is displaying it, so something above the
 * sheet has to hold it. Keeping it here also means the sheet stays
 * presentational and testable without fake timers.
 *
 * FAILURE IS STICKY AND SUCCESS IS NOT. A failed save leaves `status` at
 * 'failed' until the user types or taps again, because the message is the only
 * thing telling them the moment did not land. Success clears itself by closing
 * the sheet.
 *
 * ONE TAP IS ONE WRITE. `save` refuses to start while a write is in flight or
 * while the acknowledgment is up, so a double tap on Save cannot produce two
 * documents.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { GoodMomentStatus } from '../components/dashboard/GoodMomentSheet';
import { GOOD_MOMENT_SAVED_HOLD_MS } from '../components/dashboard/goodMoments.copy';
import { createMoment } from '../services/firebase/moments.service';
import { logger } from '../utils/logger';

export interface GoodMomentHandle {
  /** Whether the sheet is mounted. */
  open: boolean;
  status: GoodMomentStatus;
  openSheet: () => void;
  /** Cancel, swipe, overlay tap and hardware back all arrive here. */
  closeSheet: () => void;
  /** Writes one moment. The text is already trimmed by the sheet. */
  save: (text: string) => Promise<void>;
}

export function useGoodMoment(
  userId: string | null | undefined
): GoodMomentHandle {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GoodMomentStatus>('idle');
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  // A pending close must not fire into an unmounted screen.
  useEffect(() => clearHold, [clearHold]);

  const openSheet = useCallback(() => {
    clearHold();
    // Reset here rather than on close, so a sheet that is closing while showing
    // its acknowledgment does not flicker back to idle on the way out.
    setStatus('idle');
    setOpen(true);
  }, [clearHold]);

  const closeSheet = useCallback(() => {
    clearHold();
    setOpen(false);
  }, [clearHold]);

  const save = useCallback(
    async (text: string) => {
      if (status === 'saving' || status === 'saved') return;
      if (!userId) {
        // Nothing to own the row. Surfaced as a failure rather than swallowed:
        // the user asked for something to be saved and it was not.
        setStatus('failed');
        return;
      }

      setStatus('saving');
      try {
        await createMoment(userId, text);
        setStatus('saved');
        clearHold();
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          setOpen(false);
        }, GOOD_MOMENT_SAVED_HOLD_MS);
      } catch (error) {
        // `logger.warn` rather than `logger.log`: the latter is __DEV__-gated
        // and invisible on a device, which is exactly where this would need
        // reading.
        logger.warn('[goodMoment] save failed', error);
        setStatus('failed');
      }
    },
    [userId, status, clearHold]
  );

  return { open, status, openSheet, closeSheet, save };
}

export default useGoodMoment;
