/**
 * The in-flight answers for one run of the Remove capture (slice 3c-i).
 *
 * ONE TERMINAL WRITE, matching the onboarding V3 pattern: every screen adds to
 * this context and NOTHING is persisted until the first-move screen completes.
 * A user who backs out mid-flow leaves no half-capture behind, which is what
 * makes the entry card's "not captured yet" gate honest.
 *
 * THE FREE TEXT LIVES HERE ONLY AFTER THE PRE-CHECK PASSES. The clarify screen
 * runs the check before calling setText, so a failing answer never enters this
 * state and therefore cannot reach the write or the confirmation echo.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { RemoveFamily, RemoveTiming } from '../../../types/models';

interface RemoveCaptureState {
  family: RemoveFamily | null;
  chipId: string | null;
  /** The label to echo on the confirmation, when the user tapped a chip. */
  chipLabel: string | null;
  text: string | null;
  timing: RemoveTiming | null;
}

interface RemoveCaptureContextValue extends RemoveCaptureState {
  setChip: (id: string, label: string) => void;
  setFamily: (family: RemoveFamily) => void;
  setTiming: (timing: RemoveTiming) => void;
  /** Only ever called with text that has passed the crisis pre-check. */
  setText: (text: string) => void;
  reset: () => void;
}

const EMPTY: RemoveCaptureState = {
  family: null,
  chipId: null,
  chipLabel: null,
  text: null,
  timing: null,
};

const RemoveCaptureContext = createContext<RemoveCaptureContextValue | null>(null);

export const RemoveCaptureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<RemoveCaptureState>(EMPTY);

  const setChip = useCallback(
    (id: string, label: string) =>
      setState((s) => ({ ...s, chipId: id, chipLabel: label })),
    []
  );
  const setFamily = useCallback(
    (family: RemoveFamily) => setState((s) => ({ ...s, family })),
    []
  );
  const setTiming = useCallback(
    (timing: RemoveTiming) => setState((s) => ({ ...s, timing })),
    []
  );
  const setText = useCallback(
    (text: string) => setState((s) => ({ ...s, text })),
    []
  );
  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo(
    () => ({ ...state, setChip, setFamily, setTiming, setText, reset }),
    [state, setChip, setFamily, setTiming, setText, reset]
  );

  return (
    <RemoveCaptureContext.Provider value={value}>{children}</RemoveCaptureContext.Provider>
  );
};

export function useRemoveCapture(): RemoveCaptureContextValue {
  const ctx = useContext(RemoveCaptureContext);
  if (!ctx) {
    throw new Error('useRemoveCapture must be used inside RemoveCaptureProvider');
  }
  return ctx;
}
