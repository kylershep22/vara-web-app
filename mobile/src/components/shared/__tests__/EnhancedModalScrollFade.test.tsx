// Sizing and the below-the-fold signal on the shared modal shell.
//
// THE BUG THESE PIN. The container carried `{ maxHeight, minHeight: 480 }` and
// no height, which reads as "size to content, clamped" and is not: nothing
// inside reports a height back through the flex chain, so every EnhancedModal
// in the app rendered at exactly the 480 floor no matter how much room its cap
// allowed. The daily picker's time question therefore sat below a fold with
// 239pt of unused space beneath it, and the fade, which was asking "is content
// taller than the viewport", answered yes and painted itself over the chip row.
// Both halves of that are behaviour, not appearance, so both are pinned here.
//
// The measurements are driven through the real callbacks the shell wires up
// rather than mocked, so a test cannot pass against a shell that stopped
// measuring.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

import { EnhancedModal } from '../EnhancedModal';
import { FADE_HEIGHT, SCROLL_BOTTOM_PADDING } from '../ScrollFade';
import { MIN_MODAL_HEIGHT } from '../modalHeight';

const FADE = 'modal-scroll-fade';

// A cap well clear of the floor, so "grew to fit" and "hit the floor" cannot be
// confused for one another.
const CAP_PERCENT = 0.5;
const CAP = Dimensions.get('window').height * CAP_PERCENT;

// Stand-ins for the two fixed bands. The exact values do not matter; that they
// are counted does.
const HEADER = 58;
const FOOTER = 129;

function renderModal({ withFooter = true }: { withFooter?: boolean } = {}) {
  return render(
    <EnhancedModal
      visible
      onDismiss={jest.fn()}
      title="Today"
      maxHeightPercent={CAP_PERCENT}
      footer={withFooter ? <Text>confirm</Text> : undefined}
    >
      <Text>content</Text>
    </EnhancedModal>
  );
}

/** Drive the three measurements the shell derives its height from. */
function measure(contentHeight: number, { withFooter = true } = {}) {
  act(() => {
    screen
      .getByTestId('modal-header')
      .props.onLayout({ nativeEvent: { layout: { height: HEADER } } });
    if (withFooter) {
      screen
        .getByTestId('modal-footer')
        .props.onLayout({ nativeEvent: { layout: { height: FOOTER } } });
    }
    screen
      .UNSAFE_getByProps({ nestedScrollEnabled: true })
      .props.onContentSizeChange(0, contentHeight);
  });
}

function containerStyle() {
  return StyleSheet.flatten(screen.getByTestId('modal-container').props.style);
}

describe('EnhancedModal sizing', () => {
  test('takes no explicit height until the parts have measured', () => {
    // Sizing from zeroes would paint a container shorter than its own floor for
    // a frame. Until there is something to measure, minHeight stays in charge.
    renderModal();

    expect(containerStyle().height).toBeUndefined();
    expect(containerStyle().minHeight).toBe(MIN_MODAL_HEIGHT);
  });

  test('GROWS TO FIT its content instead of sitting at the floor', () => {
    // THE WALK FAILURE. 58 + 422 + 129 is 609, comfortably inside a cap of 667,
    // and the shell used to render this at 480 and scroll the difference. The
    // daily picker's second question lived in that difference.
    renderModal();

    measure(422);

    expect(containerStyle().height).toBe(HEADER + 422 + FOOTER);
    expect(containerStyle().height).toBeGreaterThan(MIN_MODAL_HEIGHT);
  });

  test('is exactly min(natural, cap)', () => {
    renderModal();

    measure(2000);

    expect(HEADER + 2000 + FOOTER).toBeGreaterThan(CAP);
    expect(containerStyle().height).toBe(CAP);
  });

  test('never goes below the floor, however little content there is', () => {
    renderModal();

    measure(10);

    expect(containerStyle().height).toBe(MIN_MODAL_HEIGHT);
  });

  test('does NOT stretch a modal whose content already fit', () => {
    // The shared-shell safety property. `scrollContent` has flexGrow, so short
    // content is reported AS the viewport it was padded into; the sum is then
    // exactly the height the shell already had, and the container does not
    // move. A short confirmation modal must not become a tall one.
    renderModal();

    const viewportAtFloor = MIN_MODAL_HEIGHT - HEADER - FOOTER;
    measure(viewportAtFloor);

    expect(containerStyle().height).toBe(MIN_MODAL_HEIGHT);
  });

  test('counts a footer only when there is one', () => {
    renderModal({ withFooter: false });

    measure(600, { withFooter: false });

    expect(containerStyle().height).toBe(HEADER + 600);
  });
});

describe('EnhancedModal scroll fade', () => {
  test('stays away while nothing has measured', () => {
    renderModal();

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('stays away when the content fits inside the cap', () => {
    // THE SECOND HALF OF THE WALK FAILURE. Content of 422 fits a cap of 667, so
    // there is nothing below the fold and nothing to signal. A viewport-based
    // test answered this "yes" because the container had not finished growing,
    // and painted the band across the chip row.
    renderModal();

    measure(422);

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('appears when the content genuinely exceeds the cap', () => {
    renderModal();

    measure(2000);

    expect(screen.getByTestId(FADE)).toBeTruthy();
  });

  test('tolerates sub-pixel rounding rather than fading over nothing', () => {
    renderModal();

    measure(CAP - HEADER - FOOTER + 0.5);

    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('clears again when the content stops overflowing', () => {
    // Dynamic Type and keyboard avoidance both re-measure. The signal tracks
    // the current state rather than latching on the first overflow it sees.
    renderModal();

    measure(2000);
    expect(screen.getByTestId(FADE)).toBeTruthy();

    measure(422);
    expect(screen.queryByTestId(FADE)).toBeNull();
  });

  test('leaves the last control room to scroll clear of the band', () => {
    // Without trailing clearance the final interactive element comes to rest
    // under the fade at the bottom of the scroll and reads dimmed, which on a
    // selected teal chip is indistinguishable from disabled. What sits under
    // the band at the end of a scroll has to be empty space.
    renderModal();

    measure(2000);

    const spacer = StyleSheet.flatten(
      screen.getByTestId('modal-scroll-bottom-padding').props.style
    );

    expect(spacer.height).toBe(SCROLL_BOTTOM_PADDING);
    expect(SCROLL_BOTTOM_PADDING).toBeGreaterThanOrEqual(FADE_HEIGHT);
  });

  test('never intercepts a touch meant for the content underneath', () => {
    renderModal();

    measure(2000);

    expect(screen.getByTestId(FADE).props.pointerEvents).toBe('none');
  });

  test('is static, so Reduce Motion has nothing to gate', () => {
    // The fade reports that content exists, not that anything is moving. A
    // plain conditional render with no Animated value and no transition, which
    // is deliberate: an animated affordance would need a useReducedMotion
    // branch and would be one more thing to get wrong.
    renderModal();

    measure(2000);

    const style = StyleSheet.flatten(screen.getByTestId(FADE).props.style);

    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe(0);
    expect(style.transform).toBeUndefined();
  });
});
