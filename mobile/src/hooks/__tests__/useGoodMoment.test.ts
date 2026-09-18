import { act, renderHook, waitFor } from '@testing-library/react-native';

type Args = unknown[];

const mockCreateMoment = jest.fn(async (...a: Args) => {
  void a;
  return 'new-moment-id';
});

jest.mock('../../services/firebase/moments.service', () => ({
  createMoment: (...a: Args) => mockCreateMoment(...a),
}));

jest.mock('../../utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

import { useGoodMoment } from '../useGoodMoment';
import { GOOD_MOMENT_SAVED_HOLD_MS } from '../../components/dashboard/goodMoments.copy';
import { logger } from '../../utils/logger';

const ALICE = 'alice-uid';

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateMoment.mockResolvedValue('new-moment-id');
});

describe('useGoodMoment — opening and closing', () => {
  it('starts closed and idle', () => {
    const { result } = renderHook(() => useGoodMoment(ALICE));

    expect(result.current.open).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('opens on request and writes nothing on the way in', () => {
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());

    expect(result.current.open).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(mockCreateMoment).not.toHaveBeenCalled();
  });

  it('closes without writing', () => {
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    act(() => result.current.closeSheet());

    expect(result.current.open).toBe(false);
    expect(mockCreateMoment).not.toHaveBeenCalled();
  });

  it('resets a previous failure when reopened', async () => {
    mockCreateMoment.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('first try');
    });
    expect(result.current.status).toBe('failed');

    act(() => result.current.closeSheet());
    act(() => result.current.openSheet());

    expect(result.current.status).toBe('idle');
  });
});

describe('useGoodMoment — the write', () => {
  it('passes the uid and the text straight through', async () => {
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('the dog met me at the door');
    });

    expect(mockCreateMoment).toHaveBeenCalledWith(ALICE, 'the dog met me at the door');
  });

  it('lands on saved, then closes itself after the hold', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useGoodMoment(ALICE));

      act(() => result.current.openSheet());
      await act(async () => {
        await result.current.save('a good bit');
      });

      expect(result.current.status).toBe('saved');
      // Still open: the acknowledgment has to be readable before the sheet goes.
      expect(result.current.open).toBe(true);

      act(() => {
        jest.advanceTimersByTime(GOOD_MOMENT_SAVED_HOLD_MS - 1);
      });
      expect(result.current.open).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.open).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('holds for 1.25s, which is the decided deviation from 14.3', () => {
    expect(GOOD_MOMENT_SAVED_HOLD_MS).toBe(1250);
  });

  it('refuses a second write while one is in flight', async () => {
    let release: (v: string) => void = () => {};
    mockCreateMoment.mockImplementationOnce(
      () => new Promise<string>((resolve) => { release = resolve; })
    );
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    act(() => {
      void result.current.save('once');
    });
    await waitFor(() => expect(result.current.status).toBe('saving'));

    await act(async () => {
      await result.current.save('twice');
    });

    expect(mockCreateMoment).toHaveBeenCalledTimes(1);

    await act(async () => {
      release('new-moment-id');
    });
  });

  it('refuses a further write while the acknowledgment is up', async () => {
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('once');
    });
    expect(result.current.status).toBe('saved');

    await act(async () => {
      await result.current.save('twice');
    });

    expect(mockCreateMoment).toHaveBeenCalledTimes(1);
  });
});

describe('useGoodMoment — failure', () => {
  it('lands on failed and keeps the sheet open', async () => {
    mockCreateMoment.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('will not land');
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.open).toBe(true);
  });

  it('allows a retry after a failure, and the retry can succeed', async () => {
    mockCreateMoment.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('same words');
    });
    expect(result.current.status).toBe('failed');

    await act(async () => {
      await result.current.save('same words');
    });

    expect(result.current.status).toBe('saved');
    expect(mockCreateMoment).toHaveBeenCalledTimes(2);
  });

  it('reports the failure through logger.warn, which is visible on device', async () => {
    mockCreateMoment.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useGoodMoment(ALICE));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('nope');
    });

    // logger.log is __DEV__-gated and invisible on a device, which is exactly
    // where this would need reading.
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('fails rather than silently dropping the moment when there is no user', async () => {
    const { result } = renderHook(() => useGoodMoment(undefined));

    act(() => result.current.openSheet());
    await act(async () => {
      await result.current.save('nobody to own this');
    });

    expect(mockCreateMoment).not.toHaveBeenCalled();
    expect(result.current.status).toBe('failed');
  });
});

describe('useGoodMoment — the pending close', () => {
  it('is cancelled on unmount, so it cannot fire into a dead screen', async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    try {
      const { result, unmount } = renderHook(() => useGoodMoment(ALICE));

      act(() => result.current.openSheet());
      await act(async () => {
        await result.current.save('a good bit');
      });

      const before = clearSpy.mock.calls.length;
      unmount();

      // Asserting the cancellation, not the absence of a crash: React 18 no
      // longer warns on a setState after unmount, so "it did not throw" would
      // pass just as well with no cleanup at all.
      expect(clearSpy.mock.calls.length).toBeGreaterThan(before);

      act(() => {
        jest.advanceTimersByTime(GOOD_MOMENT_SAVED_HOLD_MS * 2);
      });
    } finally {
      clearSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('is cancelled when the sheet is closed by hand during the hold', async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    try {
      const { result } = renderHook(() => useGoodMoment(ALICE));

      act(() => result.current.openSheet());
      await act(async () => {
        await result.current.save('a good bit');
      });

      const before = clearSpy.mock.calls.length;
      act(() => result.current.closeSheet());

      expect(clearSpy.mock.calls.length).toBeGreaterThan(before);
      expect(result.current.open).toBe(false);
    } finally {
      clearSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('a stale hold cannot close a sheet the user has just reopened', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useGoodMoment(ALICE));

      act(() => result.current.openSheet());
      await act(async () => {
        await result.current.save('a good bit');
      });

      act(() => result.current.closeSheet());
      expect(result.current.open).toBe(false);

      // Reopened inside what would have been the hold window: the stale timer
      // must not close the sheet the user just opened.
      act(() => result.current.openSheet());
      act(() => {
        jest.advanceTimersByTime(GOOD_MOMENT_SAVED_HOLD_MS * 2);
      });

      expect(result.current.open).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
