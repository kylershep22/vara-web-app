/**
 * Toast timing beyond RG13 (NPM-3a-ii build 2): a toast keeps its own
 * duration when the provider re-renders for an unrelated reason. Found by the
 * mutation pass: an inline onDismiss restarted the toast's timer on every
 * re-render of ToastProvider. Same harness as rg13.toastNewestWins.test.tsx.
 *
 * The real ToastProvider and the real NotificationToast, on fake timers. The
 * toast's display time is 3500 ms and its fade-out 300 ms (ToastContext and
 * NotificationToast). React.lazy is stood in as in rg7to12: jest cannot run
 * ToastContext's dynamic import, so the stand-in returns the real component.
 *
 * Under jest an Animated animation completes at once, so the fade-out would
 * have no duration and the race in RG13b could not occur. Animated.timing
 * and Animated.parallel are spied so an animation completes after its real
 * duration on the fake clock (parallel: after its longest member).
 */
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    lazy: () =>
      function LazyStandIn(props: Record<string, unknown>) {
        const Toast = jest.requireActual('../../components/shared/NotificationToast').default;
        return actual.createElement(Toast, props);
      },
  };
});
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'MockedMaterialCommunityIcons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { Animated, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { ToastProvider, useToast } from '../../context/ToastContext';

let show: ((title: string, body: string) => void) | null = null;

function Probe() {
  const { showNotificationToast } = useToast();
  show = (title, body) => showNotificationToast(title, body);
  return null;
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function showToast(body: string) {
  await act(async () => {
    show?.('New message', body);
  });
  await advance(0);
}

type Done = ((result: { finished: boolean }) => void) | undefined;
type Timed = { duration: number; start: (done?: Done) => void; stop: () => void; reset: () => void };

beforeEach(() => {
  jest.useFakeTimers();
  show = null;
  jest.spyOn(Animated, 'timing').mockImplementation(((
    value: Animated.Value,
    config: { toValue: number; duration?: number }
  ) => {
    const duration = config.duration ?? 0;
    const anim: Timed = {
      duration,
      start: (done?: Done) => {
        setTimeout(() => {
          value.setValue(config.toValue);
          done?.({ finished: true });
        }, duration);
      },
      stop: () => undefined,
      reset: () => undefined,
    };
    return anim;
  }) as unknown as typeof Animated.timing);
  jest.spyOn(Animated, 'parallel').mockImplementation(((animations: Timed[]) => {
    const duration = Math.max(0, ...animations.map((a) => a.duration ?? 0));
    return {
      duration,
      start: (done?: Done) => {
        animations.forEach((a) => a.start());
        setTimeout(() => done?.({ finished: true }), duration);
      },
      stop: () => undefined,
      reset: () => undefined,
    };
  }) as unknown as typeof Animated.parallel);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});


function tree(label: string) {
  return (
    <ToastProvider>
      <Probe />
      <Text>{label}</Text>
    </ToastProvider>
  );
}

test('an unrelated re-render of the provider does not extend a showing toast', async () => {
  // Mutation caught: onDismiss passed as a new function on every render.
  const view = render(tree('first render'));
  await showToast('Ana sent you a message.');

  await advance(2000);
  view.rerender(tree('second render'));
  await advance(0);
  expect(screen.getByText('Ana sent you a message.')).toBeTruthy();

  // Its own 3500 ms and the 300 ms fade have passed since it was shown.
  await advance(1900);
  expect(screen.queryByText('Ana sent you a message.')).toBeNull();
});
