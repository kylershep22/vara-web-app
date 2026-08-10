// The entry to the weekly close (spec 8), ported onto Home.
//
// ONE PROPERTY MATTERS MORE THAN THE REST: the event fires on the TAP, before
// the navigation, and never behind a success branch. Every other event in the
// weekly loop records something that landed; this one records an INTENT, and
// its whole value is the gap between it and `weekly_close` — a tap with no
// close is the abandon signal, and there is no other way to see one. Moving it
// after a write would delete the only thing it measures.

const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useWeeklyCloseEntry } from '../useWeeklyCloseEntry';

describe('useWeeklyCloseEntry', () => {
  beforeEach(() => {
    mockLogEvent.mockReset();
  });

  test('fires weekly_close_entry once, with an empty payload', () => {
    const navigate = jest.fn();
    const { result } = renderHook(() => useWeeklyCloseEntry('u1', navigate));

    act(() => result.current());

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    const [uid, name, params] = mockLogEvent.mock.calls[0];
    expect(uid).toBe('u1');
    expect(name).toBe('weekly_close_entry');
    expect(params).toEqual({});
  });

  test('fires on the TAP, before the navigation', () => {
    const order: string[] = [];
    mockLogEvent.mockImplementation(() => order.push('event'));
    const navigate = jest.fn(() => order.push('navigate'));
    const { result } = renderHook(() => useWeeklyCloseEntry('u1', navigate));

    act(() => result.current());

    expect(order).toEqual(['event', 'navigate']);
  });

  test('a throwing analytics call still opens the close', () => {
    mockLogEvent.mockImplementation(() => {
      throw new Error('analytics exploded');
    });
    const navigate = jest.fn();
    const { result } = renderHook(() => useWeeklyCloseEntry('u1', navigate));

    act(() => result.current());

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  test('does not fire on render, only on the tap', () => {
    // No render-fired events. Continuity rides on the close itself, precisely
    // so the log is not dominated by Home re-entries.
    renderHook(() => useWeeklyCloseEntry('u1', jest.fn()));

    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test('still navigates when there is no signed-in uid to attribute', () => {
    const navigate = jest.fn();
    const { result } = renderHook(() => useWeeklyCloseEntry(undefined, navigate));

    act(() => result.current());

    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
