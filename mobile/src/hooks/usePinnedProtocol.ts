/**
 * The protocol sheet's pin, and the completion that belongs to it (slice 9.1b).
 *
 * AN OPEN SHEET IS AN IMMUTABLE PROTOCOL SNAPSHOT, NOT A LIVE RENDERING OF THE
 * TODAY CARD. Kyle's ruling, and everything below follows from it.
 *
 * WHY useTodayCard's OWN COMPLETION CANNOT SERVE THE SHEET. `markDone` writes
 * the LIVE date and the LIVE variant, deliberately: that is correct for a card
 * that re-renders with the day, and dayRollover.test.ts and variantStale.test.ts
 * pin it as the settled contract. Its two flags, `staleDate` and
 * `variantStale`, are true only from the render where something moves until
 * the reload commits. After that both are false again and `markDone` would
 * write whatever the card now holds. For a surface the user opened and is
 * reading, that is a silent substitution. So the sheet has its own operation,
 * which writes what the sheet SHOWS and nothing else.
 *
 * WHY IT LIVES HERE AND NOT IN useTodayCard. That hook is over its line limit
 * and carries four invariants a change must not disturb (TODAYCARD-EXTRACTION).
 * Nothing this module needs is private to it: every input is on the returned
 * card, so the boundary is a projection of that card and one write, and the
 * hook is untouched. `markDone` is not broadened, not wrapped and not called.
 *
 * THE TWO DIVERGENCES ARE TREATED DIFFERENTLY, AND THE ASYMMETRY IS THE POINT.
 *
 *   MIDNIGHT DOES NOT INVALIDATE A PIN. A Monday protocol opened on Monday may
 *   be completed after midnight, and it writes MONDAY, with Monday's identity.
 *   That row is honest: it is the day the user was reading about.
 *
 *   A KNOWN SAME-DAY VARIANT CHANGE DOES. Completing the pin would write the
 *   previous variant's identity onto a day the new one counts, which is the
 *   defect STALE-SOURCE-COMPLETION closed. The pin is kept on screen, its
 *   completion becomes unavailable, and the sheet says so. The divergence
 *   LATCHES: a pin that went stale on Monday does not become completable again
 *   because the live day moved on to Tuesday.
 *
 * THE GUARANTEE, AND ITS LIMIT, STATED SO THE BOUNDARY IS NOT MISTAKEN FOR AN
 * OVERSIGHT. The operation completes the pinned date and protocol the sheet
 * actually represents, PROVIDED that protocol is still valid against the
 * journey and variant state KNOWN BY THIS DEVICE at the moment of completion.
 * It is NOT authoritatively validated: journey identity is not re-read from
 * journeyStates at write time, by Kyle's ruling. A journey change made on
 * another device that this client has not observed is OUTSIDE this guarantee
 * and is ledgered as CROSS-CLIENT-STATE-FRESHNESS. Do not add a second-document
 * read here to close it; that is the defect class this row explicitly does not
 * take on. What IS authoritative is the daily-log side: `upsertDailyLog` reads
 * the stored row before it writes, and its provenance rule is honoured
 * normally, so a day that is already complete keeps its original record.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResolvedProtocolVariant } from '../protocolEngine';
import { upsertDailyLog } from '../services/firebase/dailyLog.service';
import { logger } from '../utils/logger';
import type { TodayCard } from './useTodayCard';

/**
 * What the pin reads from the live card. A PROJECTION OF TodayCard, so Home
 * passes the card itself and there is no adapter to drift from it.
 */
export type LiveToday = Pick<
  TodayCard,
  'protocol' | 'todayIso' | 'completed' | 'consistentDays' | 'staleDate' | 'variantStale'
>;

/** Everything the sheet shows, fixed at the moment it opened. */
export interface ProtocolSnapshot {
  protocol: ResolvedProtocolVariant;
  /** The day the protocol was served for. The completion writes THIS row. */
  iso: string;
  /** Was that day already done when the sheet opened? */
  completedAtOpen: boolean;
  /** For the acknowledgment quieting rule, pinned with everything else. */
  consistentDays: number;
}

export interface PinnedProtocol {
  /** The open sheet's content, or null when no sheet is open. */
  snapshot: ProtocolSnapshot | null;
  /** Pin the live protocol. Refuses unless it is currently valid. */
  open: () => void;
  close: () => void;
  /** Complete the PINNED day with the PINNED identity. Never the live ones. */
  complete: () => void;
  /** The pinned day is done, by any route this device knows about. */
  done: boolean;
  /** This device knows the day's plan has moved on from the pin. Latched. */
  diverged: boolean;
  /** The completion control is actionable. */
  completable: boolean;
  saving: boolean;
  saveFailed: boolean;
  /**
   * The date this device has completed (or is optimistically completing) from
   * the sheet. SURVIVES THE SHEET CLOSING, because Home reads it for the card:
   * the card shows done when this equals the LIVE `todayIso`, and only then.
   * A Monday completion made on Tuesday can therefore never mark Tuesday's
   * card done. Cleared if the write fails.
   */
  completedIso: string | null;
}

/**
 * THE WRITE, taking the date and the protocol it records as ARGUMENTS.
 *
 * The same row shape `markDone` writes, from a different source: `markDone`
 * reads its protocol off the live card, and this reads nothing but what it is
 * handed. The provenance keys are conditional for the reason recorded there:
 * `family` is undefined on every Recover and Refocus variant, and this
 * Firestore instance throws on an explicit undefined.
 */
export async function writePinnedCompletion(
  uid: string,
  iso: string,
  protocol: ResolvedProtocolVariant
): Promise<void> {
  await upsertDailyLog(uid, iso, {
    protocolCompleted: true,
    practiceIds: [],
    completionSource: 'user_declared',
    ...(protocol.id ? { protocolCellId: protocol.id } : {}),
    ...(protocol.family ? { protocolFamily: protocol.family } : {}),
  });
}

export function usePinnedProtocol(uid: string | undefined, live: LiveToday): PinnedProtocol {
  const [snapshot, setSnapshot] = useState<ProtocolSnapshot | null>(null);
  const [divergedLatch, setDivergedLatch] = useState(false);
  const [completedIso, setCompletedIso] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // The write outlives the render it was started in, so its settle answers to
  // the mount, the same rule useTodayCard's callbacks follow.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * ONLY A CURRENTLY VALID RENDERED PROTOCOL MAY BECOME A PIN. Either flag true
   * means the card already knows what it holds is transitional; pinning it
   * would freeze exactly the thing the flags exist to distrust. The card
   * disables its entry on the same two flags, and this refusal is the write-
   * side twin of that, on the `markDone` precedent: a tap already dispatched
   * when a flag rose must still not pin.
   */
  const open = useCallback(() => {
    if (!live.protocol || live.staleDate || live.variantStale) return;
    setSnapshot({
      protocol: live.protocol,
      iso: live.todayIso,
      completedAtOpen: live.completed,
      consistentDays: live.consistentDays,
    });
    setDivergedLatch(false);
    setSaveFailed(false);
  }, [
    live.protocol,
    live.staleDate,
    live.variantStale,
    live.todayIso,
    live.completed,
    live.consistentDays,
  ]);

  const close = useCallback(() => {
    setSnapshot(null);
    setDivergedLatch(false);
    setSaveFailed(false);
  }, []);

  // Is the live card still describing the pinned DAY, with a load that has
  // settled? Only then can it say anything about the pin's variant.
  const sameDay = snapshot !== null && live.todayIso === snapshot.iso;
  const liveSettled = !live.staleDate && !live.variantStale;

  /**
   * A KNOWN divergence: the live card has committed a load for the pinned day
   * and it serves a different cell.
   *
   * CELL ID, NOT THE VARIANT IDENTITY'S INPUTS. The id is what the row
   * records, so it is the thing a substitution would change. A revision that
   * moves an input and still resolves the same cell - a capture whose family
   * orders nothing, an adjustment the engine refuses - writes an identical row,
   * and calling that diverged would dead-end the sheet for nothing.
   *
   * NOT KNOWN INSIDE THE WINDOW. While a flag is up the new load has not said
   * what it resolves to, so completion is held (below) but no divergence is
   * claimed: the window may close on the same cell.
   *
   * NOT KNOWN WITH NO LIVE PROTOCOL either, which on the same day means the
   * reload failed. Completion is held for that too, since nothing confirms
   * the pin; the sheet cannot say the plan has changed, because it does not
   * know that it has.
   */
  const knownDivergence =
    sameDay && liveSettled && live.protocol !== null && live.protocol.id !== snapshot?.protocol.id;

  useEffect(() => {
    if (knownDivergence) setDivergedLatch(true);
  }, [knownDivergence]);

  // Derived as well as latched, so the render that first sees the divergence
  // already shows it; the latch only has to hold it from the next render on.
  const diverged = divergedLatch || knownDivergence;

  /**
   * THE PINNED DAY'S COMPLETION, NEVER `live.completed` ALONE. Once the live
   * card has moved to another day its `completed` belongs to that day, and a
   * pinned day already done would read as undone. The live value counts only
   * while it is still describing the pinned day.
   */
  const done =
    snapshot !== null &&
    (snapshot.completedAtOpen ||
      completedIso === snapshot.iso ||
      (sameDay && !live.staleDate && live.completed));

  const completable =
    snapshot !== null &&
    !done &&
    !diverged &&
    !saving &&
    // AFTER MIDNIGHT NOTHING ON THE LIVE CARD DESCRIBES THE PINNED DAY, so
    // there is nothing to check it against and the pin stands. On the same day
    // the live card must have settled on the pinned cell.
    (!sameDay || (liveSettled && live.protocol?.id === snapshot.protocol.id));

  // A second tap in the same frame reaches the SAME callback, whose closure
  // still reads `saving` false. The ref is what makes one tap stay one write.
  const inFlightRef = useRef(false);

  const complete = useCallback(() => {
    if (!uid || !snapshot || !completable || inFlightRef.current) return;
    inFlightRef.current = true;
    // Captured from the pin, never from `live`. These three lines are the
    // whole difference from `markDone`.
    const { iso, protocol } = snapshot;

    setSaving(true);
    setSaveFailed(false);
    setCompletedIso(iso);

    (async () => {
      try {
        await writePinnedCompletion(uid, iso, protocol);
        inFlightRef.current = false;
        if (!mountedRef.current) return;
        setSaving(false);
      } catch (error) {
        logger.error('[usePinnedProtocol] completion write failed:', error);
        inFlightRef.current = false;
        if (!mountedRef.current) return;
        // Revert, for markDone's reason: a check that survives a failed write
        // tells the user the day is recorded when it is not.
        setCompletedIso((current) => (current === iso ? null : current));
        setSaveFailed(true);
        setSaving(false);
      }
    })();
  }, [uid, snapshot, completable]);

  return {
    snapshot,
    open,
    close,
    complete,
    done,
    diverged,
    completable,
    saving,
    saveFailed,
    completedIso,
  };
}
