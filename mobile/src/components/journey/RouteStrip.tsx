/**
 * The route strip: the four phases of a destination, in order, as one line
 * each.
 *
 * WHAT IT IS FOR. A1 asks the user what they want; the app then starts
 * somewhere that is not obviously that. The strip is the evidence that the
 * detour is a route rather than a diversion, so it shows all four steps at
 * once, with the first marked as where they are about to begin.
 *
 * RENDERS `short` AND ONLY `short`. PHASE_DISPLAY carries three lengths per
 * cell; `title` belongs to slice 5's map card and `gloss` to the line beneath
 * it. Reaching for either here would put map copy on an onboarding screen and
 * make two surfaces that must stay independently editable share a string by
 * accident.
 *
 * THE FRAMEWORK WORDS NEVER APPEAR. `remove | recover | rewire | refocus` are
 * keys used to look copy up; what renders is Jen's. Roadmap section 8, and
 * brandCopyGuard enforces it.
 *
 * NO COUNTERS, NO PROGRESS SEMANTICS. The strip is not a progress bar and must
 * not grow one: nothing here says "1 of 4", nothing fills in as phases
 * complete, and the current phase is marked by emphasis rather than by a
 * number. Phases advance on an offer the user accepts, never on a countdown,
 * and a strip that implied otherwise would promise a schedule the model does
 * not keep.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { PHASE_DISPLAY, PHASE_ORDER } from '../../constants/journey';
import type { DestinationKey, PhaseKey } from '../../types/models';

interface RouteStripProps {
  destination: DestinationKey;
  /**
   * The phase the user is about to start. Always 'remove' today, since every
   * journey opens there, but passed rather than assumed so the migration
   * branch can render a strip for a user whose phase came from elsewhere.
   */
  currentPhase?: PhaseKey;
  testID?: string;
}

export const RouteStrip: React.FC<RouteStripProps> = ({
  destination,
  currentPhase = 'remove',
  testID = 'journey-route-strip',
}) => (
  <View style={styles.strip} testID={testID}>
    {PHASE_ORDER.map((phase) => {
      const current = phase === currentPhase;
      return (
        <View key={phase} style={styles.row} testID={`${testID}-${phase}`}>
          <View style={[styles.marker, current && styles.markerCurrent]} />
          <Text
            style={[styles.label, current && styles.labelCurrent]}
            /* The marker is decorative and carries no text, so the emphasis on
               the current row is invisible to a screen reader. Saying it here
               is the only way the spoken strip matches the seen one. */
            accessibilityLabel={
              current
                ? `${PHASE_DISPLAY[phase][destination].short}. Starting here.`
                : PHASE_DISPLAY[phase][destination].short
            }
          >
            {PHASE_DISPLAY[phase][destination].short}
          </Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  strip: {
    marginTop: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  marker: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Spacing.sm / 2,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
    marginRight: Spacing.md,
  },
  markerCurrent: {
    backgroundColor: Colors.primary,
  },
  label: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    color: Colors.textSecondary,
  },
  labelCurrent: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default RouteStrip;
