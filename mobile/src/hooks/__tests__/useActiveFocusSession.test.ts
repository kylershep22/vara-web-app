/**
 * useActiveFocusSession — owns the persisted active-session record across a
 * focus block's lifecycle and finalizes the focusSessions row on completion or
 * on app return (B-3c.2 commit 2). The focusSession.service is mocked so the
 * hook's orchestration is tested without AsyncStorage / Firestore.
 */

const mockMint = jest.fn((): string => 'minted-1');
const mockSave = jest.fn((_r: unknown) => Promise.resolve());
const mockGet = jest.fn((): Promise<unknown> => Promise.resolve(null));
const mockClear = jest.fn(() => Promise.resolve());
const mockFinalize = jest.fn((_i: unknown) => Promise.resolve());

jest.mock('../../services/firebase/focusSession.service', () => ({
  mintFocusSessionId: () => mockMint(),
  saveActiveFocusSession: (r: unknown) => mockSave(r),
  getActiveFocusSession: () => mockGet(),
  clearActiveFocusSession: () => mockClear(),
  finalizeFocusSession: (i: unknown) => mockFinalize(i),
  isFocusSessionElapsed: (rec: { endsAt: number }, now: number) => rec.endsAt <= now,
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { TimerState } from '../useTimer';
import { useActiveFocusSession } from '../useActiveFocusSession';

interface Props {
  userId: string | null;
  timerState: TimerState;
  endsAt: number | null;
  durationMinutes: number;
  taskLabel: string | null;
}

const base: Props = {
  userId: 'u1',
  timerState: 'idle',
  endsAt: null,
  durationMinutes: 25,
  taskLabel: 'Writing',
};

beforeEach(() => {
  mockMint.mockClear();
  mockMint.mockReturnValue('minted-1');
  mockSave.mockClear();
  mockGet.mockReset();
  mockGet.mockResolvedValue(null);
  mockClear.mockClear();
  mockFinalize.mockClear();
});

describe('persist on running', () => {
  it('mints a stable id once and saves the active record when a focus block runs', () => {
    const endsAt = Date.now() + 25 * 60_000;
    renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: { ...base, timerState: 'running', endsAt },
    });
    expect(mockMint).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        focusSessionId: 'minted-1',
        userId: 'u1',
        durationMinutes: 25,
        type: 'pomodoro',
        taskLabel: 'Writing',
        endsAt,
      })
    );
  });

  it('re-saves with the SAME id when resuming (endsAt changes)', () => {
    const { rerender } = renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: { ...base, timerState: 'running', endsAt: 1000 },
    });
    expect(mockMint).toHaveBeenCalledTimes(1);
    rerender({ ...base, timerState: 'running', endsAt: 2000 });
    expect(mockMint).toHaveBeenCalledTimes(1); // not re-minted
    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(mockSave.mock.calls[1][0]).toEqual(
      expect.objectContaining({ focusSessionId: 'minted-1', endsAt: 2000 })
    );
  });

  it('clears the persisted record when paused (without losing the id)', () => {
    const { rerender } = renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: { ...base, timerState: 'running', endsAt: 1000 },
    });
    mockClear.mockClear();
    rerender({ ...base, timerState: 'paused', endsAt: 1000 });
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('does not persist a break (break_running)', () => {
    renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: { ...base, timerState: 'break_running', endsAt: 1000 },
    });
    expect(mockMint).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('finalizeCompletedBlock', () => {
  it('finalizes the running block under its stable id and clears the record', async () => {
    const { result } = renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: { ...base, timerState: 'running', endsAt: 1000 },
    });
    let written: string | null = null;
    await act(async () => {
      written = await result.current.finalizeCompletedBlock();
    });
    expect(written).toBe('minted-1');
    expect(mockFinalize).toHaveBeenCalledWith(
      expect.objectContaining({ focusSessionId: 'minted-1', userId: 'u1', type: 'pomodoro' })
    );
    expect(mockClear).toHaveBeenCalled();
    expect(result.current.getLastFocusSessionId()).toBe('minted-1');
  });
});

describe('finalize on app return (startup)', () => {
  it('finalizes a persisted record whose endsAt already passed', async () => {
    mockGet.mockResolvedValueOnce({
      focusSessionId: 'fs-old',
      userId: 'u1',
      durationMinutes: 25,
      type: 'pomodoro',
      taskLabel: null,
      startedAt: 0,
      endsAt: Date.now() - 1000,
    });
    const { result } = renderHook((p: Props) => useActiveFocusSession(p), {
      initialProps: base,
    });
    await waitFor(() =>
      expect(mockFinalize).toHaveBeenCalledWith(
        expect.objectContaining({ focusSessionId: 'fs-old' })
      )
    );
    expect(mockClear).toHaveBeenCalled();
    expect(result.current.getLastFocusSessionId()).toBe('fs-old');
  });

  it('leaves a not-yet-elapsed record alone (no fabricated completion)', async () => {
    mockGet.mockResolvedValueOnce({
      focusSessionId: 'fs-future',
      userId: 'u1',
      durationMinutes: 25,
      type: 'pomodoro',
      taskLabel: null,
      startedAt: 0,
      endsAt: Date.now() + 60_000,
    });
    renderHook((p: Props) => useActiveFocusSession(p), { initialProps: base });
    // Give the async effect a tick.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFinalize).not.toHaveBeenCalled();
  });
});
