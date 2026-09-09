/**
 * The four phases of a destination, drawn as a connected path.
 *
 * ONE COMPONENT, TWO SURFACES, BUILT ONCE ON PURPOSE (slice 4a's known gap 2,
 * roadmap section 5 amendment 2026-09-09). A2 explains the route to someone
 * about to start it; the journey map shows the same route to someone standing
 * somewhere on it. Those are the same four steps in the same order, and the two
 * surfaces disagreeing about what a phase looks like is exactly what building
 * it twice produces.
 *
 * WHAT THE TWO CALLERS VARY, and it is only ever these:
 *   - `copy`         'short' for the strip, 'full' (title + gloss) for the map.
 *   - `stateLabels`  the words for each state, and whether they are drawn.
 *   - `states`       A2 is always one current and three ahead; the map reads
 *                    the user's real position out of journeyStates.
 * Everything else is shared, which is the point.
 *
 * A2 CHANGES SHAPE HERE, DELIBERATELY. It used to be four bulleted rows, which
 * undersold the sequence on the one screen whose whole job is to make the
 * detour read as a route. The dots are now joined by a rail, so the four steps
 * read as a path with the user's position on it.
 *
 * NO COUNTERS, NO PROGRESS SEMANTICS (UI Standards 10.7, roadmap section 8).
 * Nothing here says "1 of 4", nothing fills as phases close, and no element
 * implies a total to reach. Position is shown by emphasis and by a word, never
 * by a fraction. The rail is wayfinding in a finite flow, which 10.7 permits;
 * it is not a progress bar, which 10.7 bans.
 *
 * AHEAD IS NOT LOCKED. Ahead rows are quieter, never disabled-looking and never
 * marked with a lock: section 8 says every practice is runnable at all times
 * and AHEAD opens.
 *
 * NOT PRESSABLE, AND THAT IS THIS SLICE'S SCOPE RATHER THAN AN OVERSIGHT. In
 * 5a there is nowhere for a row to go: the phase detail pages are slice 5b.
 * Rows carry no chevron, no button role and no press affordance, so nothing
 * invites a tap that would do nothing. 5b adds the destination and the
 * interaction together.
 *
 * NO MOTION, SO NOTHING TO REDUCE. The path is static: no entrance animation,
 * no fill, no stagger. `useReducedMotion` is not wired here because there is no
 * animation for it to gate, and a hook whose value nothing reads would only
 * look like coverage. If a future revision animates anything, it gates it.
 *
 * THE FRAMEWORK WORDS NEVER APPEAR. remove / recover / rewire / refocus are
 * keys used to look copy up; what renders is Jen's. Roadmap section 8, and
 * brandCopyGuard enforces it on the source.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../constants';
import { PHASE_DISPLAY, PHASE_ORDER } from '../../constants/journey';
import type { PhaseState } from '../../constants/journey';
import type { PhaseStates } from '../../journey/phaseStates';
import type { DestinationKey } from '../../types/models';

const MARKER_SIZE = 12;
const RAIL_WIDTH = 24;

/**
 * How far the marker sits below the top of its row, so it centres on the first
 * line of text rather than on the row. Derived from the type scale rather than
 * typed as a magic number: half a line of body text, less half a marker.
 */
const MARKER_TOP_OFFSET =
  (Typography.fontSize.base * Typography.lineHeight.normal) / 2 - MARKER_SIZE / 2;

/** UI Standards 5.3: text scales, capped so a long title cannot break the rail. */
const MAX_FONT_SCALE = 1.3;

export interface PhasePathProps {
  destination: DestinationKey;
  /** Where the user is, per phase. Total, so every row has an answer. */
  states: PhaseStates;
  /**
   * Which length of PHASE_DISPLAY each row carries.
   *
   * 'short' is the route strip's line; 'full' is the map card's title with its
   * gloss beneath. The two surfaces stay independently editable because they
   * read different fields of the same cell, never the same field.
   */
  copy: 'short' | 'full';
  /**
   * The word for each state. Absent states contribute nothing.
   *
   * SPOKEN EVEN WHEN NOT DRAWN. A2 passes one entry (its current-row line) with
   * `showStateLabels` off: the marker's emphasis is invisible to a screen
   * reader, so saying it in the label is the only way the spoken path matches
   * the seen one.
   */
  stateLabels?: Partial<Record<PhaseState, string>>;
  /** Draw the state words as well as speaking them. */
  showStateLabels?: boolean;
  testID?: string;
}

/** Row label, in the order the eye takes the row. Empty parts drop out. */
function spokenLabel(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join('. ');
}

/**
 * One style per state, and the differences are weight and fill only.
 *
 * SKIPPED IS DASHED, NOT RED AND NOT CROSSED OUT. It records that the user
 * passed something by; it is not an error and not a reprimand, and Coral is
 * reserved for genuine errors (UI Standards 4.4).
 */
const MARKER_STYLES: Record<PhaseState, object> = {
  done: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  current: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.25 }],
  },
  ahead: { backgroundColor: Colors.surface, borderColor: Colors.border },
  skipped: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
};

export const PhasePath: React.FC<PhasePathProps> = ({
  destination,
  states,
  copy,
  stateLabels,
  showStateLabels = false,
  testID = 'phase-path',
}) => (
  <View style={styles.path} testID={testID}>
    {PHASE_ORDER.map((phase, index) => {
      const cell = PHASE_DISPLAY[phase][destination];
      const state = states[phase];
      const primary = copy === 'short' ? cell.short : cell.title;
      const gloss = copy === 'full' ? cell.gloss : undefined;
      const stateLabel = stateLabels?.[state];
      const isFirst = index === 0;
      const isLast = index === PHASE_ORDER.length - 1;

      return (
        <View
          key={phase}
          style={styles.row}
          testID={`${testID}-${phase}`}
          accessible
          accessibilityLabel={spokenLabel([primary, stateLabel, gloss])}
        >
          <View style={styles.rail} importantForAccessibility="no">
            {!isFirst && <View style={[styles.connector, styles.connectorTop]} />}
            {!isLast && <View style={[styles.connector, styles.connectorBottom]} />}
            <View style={[styles.marker, MARKER_STYLES[state]]}>
              {state === 'done' && (
                <Icon name="check" size={MARKER_SIZE - 4} color={Colors.surface} />
              )}
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.headingRow}>
              <Text
                style={[styles.primary, state === 'current' && styles.primaryCurrent]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {primary}
              </Text>
              {showStateLabels && stateLabel ? (
                <Text
                  style={[styles.state, state === 'current' && styles.stateCurrent]}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  testID={`${testID}-${phase}-state`}
                >
                  {stateLabel}
                </Text>
              ) : null}
            </View>
            {gloss ? (
              <Text style={styles.gloss} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {gloss}
              </Text>
            ) : null}
          </View>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  path: {
    marginTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: Spacing.sm,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    paddingTop: MARKER_TOP_OFFSET,
    marginRight: Spacing.sm,
  },
  connector: {
    position: 'absolute',
    width: 2,
    left: RAIL_WIDTH / 2 - 1,
    backgroundColor: Colors.divider,
  },
  connectorTop: {
    top: 0,
    height: MARKER_TOP_OFFSET,
  },
  connectorBottom: {
    top: MARKER_TOP_OFFSET + MARKER_SIZE,
    bottom: 0,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primary: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    color: Colors.textSecondary,
  },
  primaryCurrent: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  state: {
    marginLeft: Spacing.sm,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    color: Colors.mutedSageGray,
  },
  stateCurrent: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  gloss: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    color: Colors.mutedSageGray,
  },
});

export default PhasePath;
