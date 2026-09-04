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
 * IT DOES NOT DECIDE WHEN IT IS SHOWN. That question belongs to whoever knows
 * the surface's height cap, because "content taller than the viewport" is true
 * for a frame or two while a grow-to-fit container is still growing. See
 * `useModalHeight`, which answers it against the cap instead.
 *
 * LIVES HERE RATHER THAN INSIDE EnhancedModal so the shell stays under the
 * 300-line ceiling and so the next capped surface that needs the same signal
 * gets it without reimplementing it.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing } from '../../constants';
import { withAlpha } from '../dashboard/brainStateCheckin/colorUtils';

export const FADE_HEIGHT = Spacing.xl;

/**
 * The clearance a scrolling surface owes the fade.
 *
 * DERIVED FROM THE FADE, NOT COINCIDENTALLY EQUAL TO IT. The band overlays the
 * last strip of the viewport, so without trailing padding the final interactive
 * element comes to rest underneath it at the bottom of the scroll and reads
 * dimmed, which on a selected teal chip is indistinguishable from disabled.
 * Padding at least the fade's own height guarantees that what sits under the
 * band at the end of a scroll is empty space. Strictly greater by one step so
 * the last control clears the band outright rather than tangenting it.
 */
export const SCROLL_BOTTOM_PADDING = FADE_HEIGHT + Spacing.sm;

/**
 * Dew Sage, the wash colour, so the fade reads as the surface softening rather
 * than a grey scrim laid over it.
 *
 * THE TERMINAL ALPHA IS A LEGIBILITY BUDGET, not a taste call. Anything
 * approaching 1.0 both grows its own hard top edge (the cutoff this exists to
 * avoid) and, more seriously, drains a selected control passing beneath it
 * until it reads as disabled. 0.7 is enough to say "the content continues" and
 * short of enough to change what a control underneath appears to be.
 */
const FADE_COLORS = [withAlpha(Colors.dewSage, 0), withAlpha(Colors.dewSage, 0.7)] as const;

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
