// The below-the-fold signal on the shared modal shell.
//
// WHY IT NEEDED A TEST OF ITS OWN. This shell caps its height and scrolls the
// overflow, and on iOS the scroll indicator only appears while a finger is
// down. A modal whose content runs past the fold therefore looks finished at
// rest, which is how the daily picker collected a time answer from a question
// nobody could see for a whole slice. The fade is the fix, and the property
// worth pinning is not that it renders but that it renders ONLY when there is
// genuinely something below: a fade that is always present is decoration, and
// stops carrying information the first time it lies.
//
// The measurement is the ScrollView's own two numbers, so the test drives the
// real callbacks (`onLayout`, `onContentSizeChange`) rather than mocking a
// height. Firing neither leaves both at 0, which is the honest pre-measurement
// state and must not paint a fade either.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

import { EnhancedModal } from '../EnhancedModal';

const FADE = 'modal-scroll-fade';

function renderModal() {
  return render(
    <EnhancedModal visible onDismiss={jest.fn()} title="Today" testID="shell">
      <Text>content</Text>
    </EnhancedModal>
  );
}

/**
 * Drive the two measurements the component compares. `UNSAFE_getByType` is
 * avoided: the ScrollView is reached through the testID-bearing tree instead,
 * so the test does not couple to which wrapper component renders it.
 */
function measure(viewport: number, content: number) {
  const scroll = screen.UNSAFE_getByProps({ nestedScrollEnabled: true });
  act(() => {
    scroll.props.onLayout({ nativeEvent: { layout: { height: viewport } } });
    scroll.props.onContentSizeChange(0, content);
  });
}

describe('EnhancedModal scroll fade', () => {
  test('paints nothing before anything has been measured', () => {
    // Both heights start at 0, and 0 is not greater than 0. A fade here would
    // flash on every open before layout settles.
    renderModal();

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('paints nothing when the content fits', () => {
    renderModal();

    measure(500, 400);

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('paints the fade when the content runs past the fold', () => {
    renderModal();

    measure(500, 630);

    expect(screen.getByTestId(FADE)).toBeTruthy();
  });

  test('tolerates sub-pixel rounding rather than fading over nothing', () => {
    // A content box measured at 500.5 against a 500 viewport has nothing below
    // it worth scrolling to. The 1pt slack is what keeps the signal honest.
    renderModal();

    measure(500, 500.5);

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('clears the fade again when the content stops overflowing', () => {
    // Dynamic Type and keyboard avoidance both re-measure. The signal has to
    // track the current state, not latch on the first overflow it sees.
    renderModal();

    measure(500, 630);
    expect(screen.getByTestId(FADE)).toBeTruthy();

    measure(500, 400);
    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('never intercepts a touch meant for the content underneath', () => {
    // The fade sits over the last rows of scrollable content. If it swallowed
    // presses it would turn a visibility fix into a dead control.
    renderModal();

    measure(500, 630);

    expect(screen.getByTestId(FADE).props.pointerEvents).toBe('none');
  });

  test('is static, so Reduce Motion has nothing to gate', () => {
    // The fade signals that content exists, not that anything is moving. It is
    // a plain conditional render with no Animated value and no transition, and
    // that is deliberate: an animated affordance here would need a
    // useReducedMotion branch and would be one more thing to get wrong.
    renderModal();

    measure(500, 630);

    const fade = screen.getByTestId(FADE);
    const style = Array.isArray(fade.props.style) ? fade.props.style : [fade.props.style];
    const flattened = Object.assign({}, ...style.filter(Boolean));

    expect(flattened.position).toBe('absolute');
    expect(flattened.bottom).toBe(0);
    // No animated opacity or transform rode in with it.
    expect(flattened.transform).toBeUndefined();
  });
});
