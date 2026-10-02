/**
 * useNotificationSettingsState (NPM-2). Used only by NotificationSettingsScreen;
 * the shared useNotificationPreferences hook is untouched (Decision 3).
 *
 * WHAT IS SHOWN: the loaded or listened preferences document, with this user's
 * persisted pending journal entries laid over it, with this session's own
 * changes laid over that. A change shows AT ONCE (Ruling 10) and is handed to
 * submitNotificationIntent, which persists it, then sends it, then applies it.
 * This hook never sends those Firestore writes itself.
 *
 * LOADING: the first load goes through getNotificationPreferences (which may
 * create the default document for a new user, as today). Only after it
 * succeeds is a listener attached, with includeMetadataChanges, and a listener
 * snapshot never creates anything: if the document disappears while the screen
 * is open, the last values stay on screen (Decision 8). A failed first load is
 * the unavailable state, and retry() loads again (Decision 6).
 *
 * PENDING: tracked per control. The Saving... flag appears only after a change
 * has been unresolved for 500 ms (Decision 6), and nothing ever reverts on a
 * timer: offline, the chosen value simply stays, saving.
 *
 * FAILURE: a failed journal write (Decision 12) or a confirmed rejection
 * reverts that control to its last confirmed value, unless a newer change to
 * the same control has superseded it, and shows the failure alert only if the
 * screen is still mounted. After a rejection of General or the daily time, the
 * schedule is corrected with applyDailyRhythmChoice from the values the screen
 * now shows; that runs even if the screen has been left, and the apply checks
 * ownership itself. Nothing was sent or applied after a failed journal write,
 * so that case needs no correction. Work for an account that is no longer
 * signed in does nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getNotificationPreferences } from '../services/firebase/notificationPreferences.service';
import { requireDb } from '../services/firebase/ensureDb';
import {
  IntentControl,
  IntentValues,
  ensureJournalLoaded,
  submitNotificationIntent,
} from '../services/notificationIntentJournal';
import { IntentEntries, isNotificationOwner, persistedEntries } from '../services/notificationIntentStore';
import { applyDailyRhythmChoice } from '../services/notificationScheduler.service';
import { isValidReminderTime } from '../utils/reminderTime';
import { logger } from '../utils/logger';
import { NOTIFICATION_SETTINGS_COPY as COPY } from '../screens/notificationSettings.copy';
import type { NotificationPreferences, ReminderTime } from '../types';

export const SAVING_VISIBLE_AFTER_MS = 500;

export type SettingsPhase = 'loading' | 'ready' | 'unavailable';
type Overrides = Partial<{ [K in IntentControl]: IntentValues[K] }>;

/** The shown value of every control, from the three layers. */
function shownValues(remote: NotificationPreferences | null, journal: IntentEntries, overrides: Overrides) {
  const pick = <K extends IntentControl>(control: K, fromRemote: unknown): unknown => {
    if (control in overrides) return overrides[control];
    if (journal[control]) return journal[control]!.value;
    return fromRemote;
  };
  const time = pick('dailyTime', remote?.dailyRhythm?.reminderTime ?? null);
  return {
    general: pick('general', remote?.allNotificationsEnabled) === true,
    /** A valid time, or null: an invalid stored shape is no time (shared validation). */
    dailyTime: isValidReminderTime(time) ? { hour: time.hour, minute: time.minute } : null,
    directMessages: pick('directMessages', remote?.socialConnection?.directMessages) === true,
    connectionRequests: pick('connectionRequests', remote?.socialConnection?.connectionRequests) === true,
  };
}

/** The remote document with one control set to a value Firestore has confirmed. */
function withConfirmed<K extends IntentControl>(
  remote: NotificationPreferences | null,
  control: K,
  value: IntentValues[K]
): NotificationPreferences | null {
  if (!remote) return remote;
  switch (control) {
    case 'general':
      return { ...remote, allNotificationsEnabled: value as boolean };
    case 'dailyTime':
      return { ...remote, dailyRhythm: { ...remote.dailyRhythm, enabled: true, reminderTime: value as ReminderTime } };
    case 'directMessages':
      return { ...remote, socialConnection: { ...remote.socialConnection, directMessages: value as boolean } };
    default:
      return { ...remote, socialConnection: { ...remote.socialConnection, connectionRequests: value as boolean } };
  }
}

export function useNotificationSettingsState() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [phase, setPhase] = useState<SettingsPhase>('loading');
  const [remote, setRemote] = useState<NotificationPreferences | null>(null);
  const [journal, setJournal] = useState<IntentEntries>({});
  const [overrides, setOverrides] = useState<Overrides>({});
  const [saving, setSaving] = useState<Partial<Record<IntentControl, boolean>>>({});
  const [attempt, setAttempt] = useState(0);

  // Refs mirror state so settle handlers (which may run after unmount) see the
  // values the screen shows now, not the ones it showed when the change began.
  const mounted = useRef(true);
  const remoteRef = useRef<NotificationPreferences | null>(null);
  const overridesRef = useRef<Overrides>({});
  const tokens = useRef<Partial<Record<IntentControl, number>>>({});
  const tokenCounter = useRef(0);
  const timers = useRef<Partial<Record<IntentControl, ReturnType<typeof setTimeout>>>>({});

  const putRemote = (next: NotificationPreferences | null) => {
    remoteRef.current = next;
    if (mounted.current) setRemote(next);
  };
  const putOverrides = (next: Overrides) => {
    overridesRef.current = next;
    if (mounted.current) setOverrides(next);
  };
  const refreshJournal = (owner: string) => {
    if (mounted.current) setJournal(persistedEntries(owner));
  };

  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      mounted.current = false;
      Object.values(pendingTimers).forEach((t) => t && clearTimeout(t));
    };
  }, []);

  // First load, then the listener.
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setPhase('loading');
    (async () => {
      try {
        const prefs = await getNotificationPreferences(uid);
        await ensureJournalLoaded(uid);
        if (cancelled) return;
        putRemote(prefs);
        refreshJournal(uid);
        setPhase('ready');
        unsubscribe = onSnapshot(
          doc(requireDb(), 'notificationPreferences', uid),
          { includeMetadataChanges: true },
          (snap) => {
            if (cancelled) return;
            // Decision 8: gone while open means keep showing the last values.
            // A snapshot never creates a document.
            if (!snap.exists()) return;
            putRemote({ id: snap.id, ...snap.data() } as NotificationPreferences);
            refreshJournal(uid);
          },
          (error) => logger.warn('[useNotificationSettingsState] listener error', error)
        );
      } catch (error) {
        logger.warn('[useNotificationSettingsState] first load failed', error);
        if (!cancelled) setPhase('unavailable');
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // putRemote and refreshJournal only touch refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const clearSaving = (control: IntentControl) => {
    const t = timers.current[control];
    if (t) clearTimeout(t);
    delete timers.current[control];
    if (mounted.current) setSaving((s) => ({ ...s, [control]: false }));
  };

  const dropOverride = (control: IntentControl) => {
    const next = { ...overridesRef.current };
    delete next[control];
    putOverrides(next);
  };

  /** Revert, alert if mounted, and (after a rejection) correct the schedule. */
  const fail = (owner: string, control: IntentControl, token: number, correct: boolean) => {
    if (!isNotificationOwner(owner)) return; // a departed account: nothing
    if (tokens.current[control] !== token) return; // superseded: the newer change stands
    dropOverride(control);
    refreshJournal(owner);
    clearSaving(control);
    if (mounted.current) {
      Alert.alert(COPY.failure.title, COPY.failure.body, [{ text: COPY.failure.ok }]);
    }
    if (correct && (control === 'general' || control === 'dailyTime')) {
      const now = shownValues(remoteRef.current, persistedEntries(owner), overridesRef.current);
      void applyDailyRhythmChoice(owner, { general: now.general, reminderTime: now.dailyTime });
    }
  };

  const change = useCallback(
    async <K extends IntentControl>(control: K, value: IntentValues[K]) => {
      if (!uid) return;
      const owner = uid;
      tokenCounter.current += 1;
      const token = tokenCounter.current;
      tokens.current[control] = token;

      // 1. The screen changes at once.
      putOverrides({ ...overridesRef.current, [control]: value });

      // Saving... only once the change has been unresolved for 500 ms.
      const old = timers.current[control];
      if (old) clearTimeout(old);
      timers.current[control] = setTimeout(() => {
        if (tokens.current[control] === token && mounted.current) {
          setSaving((s) => ({ ...s, [control]: true }));
        }
      }, SAVING_VISIBLE_AFTER_MS);

      // 2 to 5 belong to the journal: persist, then send, then apply.
      const now = shownValues(remoteRef.current, persistedEntries(owner), overridesRef.current);
      const effective =
        control === 'general' || control === 'dailyTime'
          ? { general: now.general, reminderTime: now.dailyTime }
          : undefined;
      const result = await submitNotificationIntent(owner, control, value, effective);

      if (result.status === 'persist-failed') {
        fail(owner, control, token, false);
        return;
      }
      if (result.status === 'session-ended') {
        if (tokens.current[control] === token) clearSaving(control);
        return;
      }
      refreshJournal(owner);

      const settled = await result.settled;
      if (settled.outcome === 'acknowledged') {
        if (tokens.current[control] === token) {
          putRemote(withConfirmed(remoteRef.current, control, value));
          dropOverride(control);
          clearSaving(control);
        }
        refreshJournal(owner);
      } else if (settled.outcome === 'rejected') {
        fail(owner, control, token, true);
      } else if (tokens.current[control] === token) {
        clearSaving(control);
      }
    },
    // fail, putOverrides and friends only touch refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid]
  );

  const shown = shownValues(remote, journal, overrides);
  return {
    phase,
    retry,
    ...shown,
    saving: {
      general: saving.general === true,
      dailyTime: saving.dailyTime === true,
      directMessages: saving.directMessages === true,
      connectionRequests: saving.connectionRequests === true,
    },
    setGeneral: (v: boolean) => change('general', v),
    setDailyTime: (t: ReminderTime) => change('dailyTime', { hour: t.hour, minute: t.minute }),
    setDirectMessages: (v: boolean) => change('directMessages', v),
    setConnectionRequests: (v: boolean) => change('connectionRequests', v),
  };
}

export default useNotificationSettingsState;
