// habitCellMarks — the shared visual vocabulary for a (habit, day) cell.
//
// Extracted from WeeklyHabitGrid so the habit detail screen's single-habit week
// strip renders the SAME marks rather than a second implementation that would
// fork on its first restyle. habitWeekState.ts owns which state a cell is in;
// this module owns what that state looks like.
//
// The rules the forms encode (Voice & Tone v2.2 §3.4, Accountability Amendment)
// travel with them:
//   - Never coral, red, or amber. A missed day is not an error. The only colors
//     here are Evergreen Teal and Silver Sage.
//   - Every state differs by FORM (disc / ring / line / size), not only by hue,
//     so the grid survives color-blindness and grayscale.
//   - Days the habit was never scheduled for are a hairline DASH, not a paler
//     dot: a paler dot reads as "extra missed", which would render a perfect
//     Mon/Wed/Fri week as 3-of-7.
//   - Completion crossfades in over 150ms and does nothing at all under Reduce
//     Motion. A calm state change, never a celebration.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { CellState } from './habitWeekState';

// Silver Sage (#B8CDBA) at explicit alphas. Written as rgba rather than an
// opacity prop so the values are legible and cannot compound with a parent.
export const SAGE_GAP = 'rgba(184, 205, 186, 0.45)';
export const SAGE_UPCOMING = 'rgba(184, 205, 186, 0.22)';
export const SAGE_DASH = 'rgba(184, 205, 186, 0.55)';
/** Silver Sage @35% — row dividers and rules. */
export const SAGE_RULE = 'rgba(184, 205, 186, 0.35)';
/** Dew Sage (#D5E3D1) @42% — the today column band. */
export const DEW_BAND = 'rgba(213, 227, 209, 0.42)';

/**
 * The mark itself. Completed crossfades over the state it replaced (150ms
 * ease-out, disabled under Reduce Motion) — a calm state change, not a
 * celebration.
 */
export const Mark: React.FC<{ state: CellState; completed: boolean }> = ({
  state,
  completed,
}) => {
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    const to = completed ? 1 : 0;
    if (reduceMotion) {
      anim.setValue(to);
      return;
    }
    Animated.timing(anim, {
      toValue: to,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [completed, reduceMotion, anim]);

  // The testID names the FORM that is on screen, so tests can assert the
  // rendered treatment of each state rather than trusting the state name.
  return (
    <View style={styles.mark}>
      {!completed && <View style={markStyleFor(state)} testID={`mark-${state}`} />}
      {completed && (
        <Animated.View
          style={[styles.completedDot, { opacity: anim }]}
          testID="mark-completed"
        >
          {/* Decorative only. The cell already announces "completed", so this
              glyph is hidden from the a11y tree and adds no label of its own. */}
          <Icon
            name="check"
            size={12}
            color={Colors.white}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="mark-completed-check"
          />
        </Animated.View>
      )}
    </View>
  );
};

export function markStyleFor(state: CellState) {
  switch (state) {
    case 'gap':
      return styles.gapDot;
    case 'today_scheduled':
      return styles.todayRing;
    case 'today_unscheduled':
      return styles.todayDashedRing;
    case 'upcoming':
      return styles.upcomingDot;
    case 'unscheduled':
      return styles.unscheduledDash;
    case 'completed':
      // Unreachable — completed renders the animated dot above.
      return styles.completedDotStatic;
  }
}

const styles = StyleSheet.create({
  // Fixed box so every mark is optically centred regardless of its size.
  mark: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── the five states, each a distinct FORM ──────────────────────────
  // Completed: the largest solid disc, the only teal fill, and the only mark
  // carrying a glyph. It was previously the QUIETEST mark on the card — the
  // single most important thing to see was the hardest to see.
  completedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDotStatic: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.evergreenTeal,
  },
  // Scheduled, past, not completed — the honest gap. A mid-size sage disc.
  gapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SAGE_GAP,
  },
  // Scheduled, future — smaller and fainter than the gap, so the two differ by
  // size as well as by tone.
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SAGE_UPCOMING,
  },
  // Scheduled, today — a hollow teal ring. Open, not filled: an invitation.
  todayRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
    backgroundColor: 'transparent',
  },
  // Not scheduled, today — a dashed hollow ring. Discoverable, but visibly not
  // asked for: it must not read as a to-do.
  todayDashedRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: Colors.silverSage,
    backgroundColor: 'transparent',
  },
  // Not scheduled — NOT a dot. A hairline dash: a different form entirely, so
  // it can never be read as one more missed day.
  unscheduledDash: {
    width: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: SAGE_DASH,
  },
});
