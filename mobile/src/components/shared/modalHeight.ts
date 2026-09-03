/**
 * Grow-to-fit sizing for the shared modal shell.
 *
 * THE BUG THIS EXISTS TO FIX. EnhancedModal's container carried
 * `{ maxHeight: <computed>, minHeight: 480 }` and no height, on the assumption
 * that a View with no height sizes to its content and gets clamped between the
 * two. It does not, because the only thing inside it that could supply a
 * content height is a ScrollView, and every layer between the two is `flex: 1`:
 * modalInner, the ScrollFadeArea, KeyboardAwareScrollView's own
 * KeyboardAvoidingView, and the ScrollView itself. A flex child claims the
 * space its parent gives it; it does not report a height upward. So the
 * container's intrinsic height collapsed to header + footer, `minHeight: 480`
 * floored it, and EVERY EnhancedModal in the app rendered at exactly 480pt
 * regardless of its content or its maxHeight. On an iPhone 15 that is 56% of
 * the screen, which is the "roughly 60% with a large dimmed band above it" the
 * device walk saw, and it is why the daily picker's time question sat below a
 * fold that had 239pt of unused room beneath it.
 *
 * THE FIX IS TO STOP ASKING FLEXBOX AND MEASURE. The three parts each report
 * their own height (`onLayout` on the header and footer, `onContentSizeChange`
 * on the scroll view, which reports true content size no matter how short the
 * viewport currently is), and the container is given an explicit height of
 * their sum, clamped. Every `flex: 1` inside then works exactly as written,
 * because it finally has a definite height to divide up.
 *
 * WHY THIS CONVERGES RATHER THAN OSCILLATING, which is the obvious worry when a
 * container's height is derived from content that is measured inside it.
 * `scrollContent` has `flexGrow: 1`, so short content is padded UP to the
 * viewport, and that is the only feedback edge. It is monotone and settles in
 * one step:
 *
 *   - Content taller than the viewport is reported at its natural height,
 *     unpadded. The container grows to fit it, the viewport grows to match,
 *     and the second measurement reports the same number. Settled.
 *   - Content shorter than the viewport is reported AS the viewport. The sum is
 *     then exactly the current height, so the container does not move at all.
 *     Settled, and this is what keeps a short confirmation modal from
 *     stretching: it stays at the 480 floor instead of growing to its cap.
 */
import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * The floor, unchanged from the value that used to be the shell's only real
 * height. Kept so that surfaces which already fit inside 480 render at exactly
 * the size they render at today: this change must not resize a modal that was
 * never broken.
 */
export const MIN_MODAL_HEIGHT = 480;

export interface ModalHeight {
  /** Explicit container height, or undefined until the parts have measured. */
  height: number | undefined;
  /** The content genuinely does not fit its cap, so the fade means something. */
  overflows: boolean;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
  onFooterLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
}

export function useModalHeight(maxHeight: number): ModalHeight {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  return useMemo(() => {
    // The footer is optional and a missing one measures 0 forever, so it is not
    // part of the readiness test. The header always renders and the scroll view
    // always reports, so those two are.
    const measured = headerHeight > 0 && contentHeight > 0;
    const natural = headerHeight + contentHeight + footerHeight;

    return {
      // Undefined before the first measurement, which leaves the old
      // minHeight/maxHeight pair in charge for that frame rather than painting
      // a container sized from zeroes.
      height: measured
        ? Math.min(Math.max(natural, MIN_MODAL_HEIGHT), maxHeight)
        : undefined,
      // ANALYTIC, NOT VIEWPORT-BASED. Asking "is the content taller than the
      // viewport" is true for a frame or two while the container is still
      // growing, which is exactly how the fade came to be painted over a chip
      // row that had room to spare. Asking whether the content exceeds the CAP
      // is the question that was meant. The 1pt slack absorbs sub-pixel
      // rounding: a signal that lies once stops carrying information.
      overflows: measured && natural > maxHeight + 1,
      onHeaderLayout,
      onFooterLayout,
      onContentSizeChange,
    };
  }, [
    headerHeight,
    footerHeight,
    contentHeight,
    maxHeight,
    onHeaderLayout,
    onFooterLayout,
    onContentSizeChange,
  ]);
}
