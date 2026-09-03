/**
 * The below-the-fold signal for a capped, scrolling surface.
 *
 * WHY IT EXISTS. A shell that caps its height and scrolls the overflow looks
 * finished at rest, because on iOS the scroll indicator is transient: present
 * while a finger is down, gone the moment it lifts. That is a correctness
 * problem rather than a cosmetic one, since a control the user never scrolls to
 * is a control they never answered. The daily picker's time question sat below
 * the fold of EnhancedModal for a whole slice exactly this way, collected from
 * a control nobody had seen.
 *
 * WHY A FADE. A hard cutoff reads as a border and says "this is the end"; an
 * arrow is chrome that has to be dismissed; a count of what remains is a
 * denominator, which is retired vocabulary. A fade says only "the content
 * continues", which is the whole message.
 *
 * IT IS STATIC. No animation, so there is no `useReducedMotion` branch to
 * write: it reports that content exists, not that anything is moving. An
 * animated affordance here would need that branch and would be one more thing
 * to get wrong.
 *
 * LIVES HERE RATHER THAN INSIDE EnhancedModal so the shell stays under the
 * 300-line ceiling and so the next capped surface that needs the same signal
 * gets it without reimplementing the measurement.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing } from '../../constants';
import { withAlpha } from '../dashboard/brainStateCheckin/colorUtils';

const FADE_HEIGHT = Spacing.xl;
// Dew Sage, the wash colour, so the fade reads as the surface softening rather
// than a grey scrim laid over it. Short of full opacity on purpose: at 1.0 the
// band grows its own hard top edge, which is the cutoff this exists to avoid.
const FADE_COLORS = [withAlpha(Colors.dewSage, 0), withAlpha(Colors.dewSage, 0.85)] as const;

/**
 * Measure a scrollable child against its viewport.
 *
 * MEASURED, NOT GUESSED. Content height depends on the caller's children, the
 * device and the user's Dynamic Type setting, so the only honest test for "is
 * there more below" is the two numbers the ScrollView itself reports. Spread
 * `scrollProps` onto the ScrollView and read `overflows`.
 */
export function useOverflowMeasure() {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  return {
    // The 1pt slack absorbs sub-pixel rounding: without it a content box
    // measuring 532.0001 against a 532 viewport paints a fade over nothing, and
    // a signal that lies once stops carrying information. Both heights start at
    // 0, so nothing paints before the first layout either.
    overflows: contentHeight > viewportHeight + 1,
    scrollProps: { onLayout, onContentSizeChange },
  };
}

interface ScrollFadeProps {
  /** Render only when there is genuinely something below. */
  visible: boolean;
}

export const ScrollFade: React.FC<ScrollFadeProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <LinearGradient
      colors={FADE_COLORS}
      style={styles.fade}
      // Never intercepts a touch: the fade sits over the last rows of content,
      // and swallowing presses would turn a visibility fix into a dead control.
      pointerEvents="none"
      testID="modal-scroll-fade"
    />
  );
};

/**
 * The positioning context the fade needs. Pinning the fade to an ancestor that
 * also contains the sticky footer would float it over the footer rather than
 * over the last line of content, so the scrollable child gets its own box.
 */
export const ScrollFadeArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.area}>{children}</View>
);

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
});
