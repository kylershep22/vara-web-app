/**
 * In-memory state for the progressive onboarding arc (V3).
 *
 * WHY A CONTEXT RATHER THAN THREADED ROUTE PARAMS. The arc is nine screens
 * long, five of them skippable, and everything the user answers is written ONCE
 * at the terminal. Threading params forward means every screen restates
 * `{...route.params, myAnswer}`, and a single omission silently drops an answer
 * that only surfaces as a missing Firestore field much later. Holding it here
 * makes back-navigation free (a screen re-reads what it already set) and gives
 * the terminal exactly one place to read.
 *
 * NOTHING HERE IS PERSISTED. This is a per-run scratchpad that dies with the
 * navigator; the writes live at the terminal. A user who force-quits mid-arc
 * starts over, which is correct for a first run with nothing yet saved.
 *
 * Provider is mounted by OnboardingNavigator around the V3 stack only, so the
 * V2 arc cannot see it and nothing outside onboarding can reach it.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CapacityTier, OutcomeKey } from '../../../weeklyEngine';

/** A reminder time, matching the ReminderTime shape the notif prefs store uses. */
export interface V3ReminderTime {
  hour: number;
  minute: number;
}

export interface OnboardingV3State {
  /** Single-select, required to leave the outcome screen. */
  outcome: OutcomeKey | null;
  /** Free text, skippable. Null means skipped, which is distinct from ''. */
  whyNote: string | null;
  /** One of the three tiers, required to leave the capacity screen. */
  capacity: CapacityTier | null;
  /** Free text, skippable. Null means skipped. */
  floorCommitment: string | null;
  /**
   * 0 = Sunday … 6 = Saturday, matching userPrivate.weekStartDay. Skippable:
   * null means no answer, and the week then anchors on the day it is opened,
   * which is what the app did before the question existed.
   */
  weekStartDay: number | null;
  /** Null until the user confirms the reminder screen (or skips it). */
  reminderTime: V3ReminderTime | null;
}

export interface OnboardingV3Value extends OnboardingV3State {
  setOutcome: (outcome: OutcomeKey) => void;
  setWhyNote: (note: string | null) => void;
  setCapacity: (capacity: CapacityTier) => void;
  setFloorCommitment: (floor: string | null) => void;
  setWeekStartDay: (day: number | null) => void;
  setReminderTime: (time: V3ReminderTime | null) => void;
}

const EMPTY: OnboardingV3State = {
  outcome: null,
  whyNote: null,
  capacity: null,
  floorCommitment: null,
  weekStartDay: null,
  reminderTime: null,
};

const OnboardingV3Context = createContext<OnboardingV3Value | null>(null);

export const OnboardingV3Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<OnboardingV3State>(EMPTY);

  const value = useMemo<OnboardingV3Value>(
    () => ({
      ...state,
      setOutcome: (outcome) => setState((s) => ({ ...s, outcome })),
      setWhyNote: (whyNote) => setState((s) => ({ ...s, whyNote })),
      setCapacity: (capacity) => setState((s) => ({ ...s, capacity })),
      setFloorCommitment: (floorCommitment) =>
        setState((s) => ({ ...s, floorCommitment })),
      setWeekStartDay: (weekStartDay) => setState((s) => ({ ...s, weekStartDay })),
      setReminderTime: (reminderTime) => setState((s) => ({ ...s, reminderTime })),
    }),
    [state]
  );

  return (
    <OnboardingV3Context.Provider value={value}>
      {children}
    </OnboardingV3Context.Provider>
  );
};

/**
 * Throws outside the provider rather than returning a null-ish default. A screen
 * rendered outside the arc is a wiring bug, and a silent empty state would show
 * up as answers vanishing rather than as the mount error it actually is.
 */
export function useOnboardingV3(): OnboardingV3Value {
  const value = useContext(OnboardingV3Context);
  if (!value) {
    throw new Error('useOnboardingV3 must be used inside OnboardingV3Provider.');
  }
  return value;
}
