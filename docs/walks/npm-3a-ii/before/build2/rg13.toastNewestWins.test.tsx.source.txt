/**
 * RG13 (NPM-3a-ii build 2, regression): two notification toasts close
 * together. Kyle's II-D8: newest wins, with a full duration, including when
 * the newer one arrives while the older one is fading out.
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
import { Animated } from 'react-native';
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

function mount() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>
  );
}

test('RG13a: a second toast while the first is visible is shown for its own full duration', async () => {
  mount();
  await showToast('Ana sent you a message.');
  expect(screen.getByText('Ana sent you a message.')).toBeTruthy();

  await advance(2000);
  await showToast('Ben sent you a message.');
  expect(screen.getByText('Ben sent you a message.')).toBeTruthy();
  expect(screen.queryByText('Ana sent you a message.')).toBeNull();

  // 3400 ms after Ben arrived: past the first toast's deadline, inside Ben's own.
  await advance(3400);
  expect(screen.getByText('Ben sent you a message.')).toBeTruthy();

  // And it does go: its own 3500 ms plus the 300 ms fade.
  await advance(1000);
  expect(screen.queryByText('Ben sent you a message.')).toBeNull();
});

test('RG13b: a toast that arrives during the previous one\'s fade-out is shown for a full duration', async () => {
  mount();
  await showToast('Ana sent you a message.');

  // 3500 ms: the first toast starts its 300 ms fade. 100 ms into it, Ben arrives.
  await advance(3600);
  await showToast('Ben sent you a message.');

  await advance(3000);
  expect(screen.getByText('Ben sent you a message.')).toBeTruthy();
});
