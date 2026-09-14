/**
 * useReduceTransparency — the hook the opaque tab-bar fallback hangs off.
 *
 * WHY THESE SHAPES AND NOT "IT RETURNS A BOOLEAN". UI Standards 12.2 promises a
 * DESIGNED opaque fallback under Reduce Transparency, and walk assertion 18(f)
 * checks it. 18(f) has two halves that fail independently: the app was launched
 * with the setting already on (the initial read), and the setting was toggled
 * while the app was foregrounded (the listener). A hook that does one and not
 * the other passes a casual walk and fails a real one, so both are pinned here
 * and both are steps in the walk script.
 *
 * The third test is the unsubscribe. A listener that outlives its component is
 * invisible until something re-renders the navigator, which is exactly the
 * thing this hook lives inside.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceTransparency } from '../useReduceTransparency';

describe('useReduceTransparency', () => {
  let listener: ((enabled: boolean) => void) | undefined;
  let remove: jest.Mock;

  const mockAccessibility = (initial: boolean) => {
    remove = jest.fn();
    listener = undefined;
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(initial);
    // `addEventListener` is overloaded per event name, so its narrowest
    // overload is what a bare mockImplementation is checked against. Capture
    // the spy loosely and assert on the recorded calls instead; the event name
    // is pinned by the `subscribes to ... and nothing else` test below.
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation(((event: string, handler: (enabled: boolean) => void) => {
        if (event === 'reduceTransparencyChanged') {
          listener = handler;
        }
        return { remove };
      }) as unknown as typeof AccessibilityInfo.addEventListener);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    // RN's AccessibilityInfo is a persistent module mock whose call history
    // accumulates across tests. restoreAllMocks alone leaves the counts, and a
    // per-test count assertion then reads every earlier test's calls too - the
    // same trap StatePickStepView.test.tsx documents.
    jest.clearAllMocks();
  });

  it('starts false before the async read resolves', () => {
    mockAccessibility(true);
    const { result } = renderHook(() => useReduceTransparency());
    // The first paint cannot know the setting. False is the right default:
    // it renders the glass, and the async read corrects it a frame later.
    // Defaulting true would flash the opaque bar for every user who has the
    // setting off, which is everyone.
    expect(result.current).toBe(false);
  });

  it('reads the setting on mount, for the cold-start-with-it-already-on case', async () => {
    mockAccessibility(true);
    const { result } = renderHook(() => useReduceTransparency());
    await waitFor(() => expect(result.current).toBe(true));
    expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalledTimes(1);
  });

  it('stays false when the setting is off', async () => {
    mockAccessibility(false);
    const { result } = renderHook(() => useReduceTransparency());
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalled()
    );
    expect(result.current).toBe(false);
  });

  it('follows the setting when it is toggled while the app is foregrounded', async () => {
    mockAccessibility(false);
    const { result } = renderHook(() => useReduceTransparency());
    await waitFor(() => expect(listener).toBeDefined());

    act(() => listener!(true));
    expect(result.current).toBe(true);

    act(() => listener!(false));
    expect(result.current).toBe(false);
  });

  it('subscribes to reduceTransparencyChanged and to nothing else', async () => {
    mockAccessibility(false);
    renderHook(() => useReduceTransparency());
    await waitFor(() => expect(AccessibilityInfo.addEventListener).toHaveBeenCalled());
    const events = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls.map(
      ([event]) => event
    );
    expect(events).toEqual(['reduceTransparencyChanged']);
  });

  it('removes its subscription on unmount', async () => {
    mockAccessibility(false);
    const { unmount } = renderHook(() => useReduceTransparency());
    await waitFor(() => expect(AccessibilityInfo.addEventListener).toHaveBeenCalled());
    expect(remove).not.toHaveBeenCalled();
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
