/**
 * Today's journey line, D1 (slice 7a, roadmap section 9 R6).
 *
 * TWO LINES OF TEXT AND NOTHING ELSE. A label, and under it the approved
 * `short` for this (phase, destination) cell. No surface, no border, no icon,
 * no chevron, no press target. Section 8 keeps Today at three cards and states
 * outright that the journey line is a text row; anything that made it tappable
 * would be a second call to action standing above the one real one.
 *
 * THE LABEL IS REQUIRED, AND THIS IS THE COMPONENT THAT WOULD OTHERWISE DROP IT.
 * Several of Jen's sixteen approved shorts are imperative-shaped - "Clear the
 * distractions", "Come down a notch". Rendered alone above the hero, an
 * imperative reads as TODAY'S INSTRUCTION rather than as journey context, and
 * the user would have two things telling them what to do with their morning.
 * The label is what makes the pair answer "where am I". It is a required prop
 * rather than an optional one for exactly that reason: there is no correct
 * rendering of this component without it.
 *
 * THE EYEBROW IDIOM IS 5b-i's, REUSED RATHER THAN REINVENTED (R6). Same type
 * ramp, same weight, same colour, same position above the thing it qualifies as
 * JourneyPhaseScreen's state word (JourneyPhaseScreen.tsx:176-182). Two surfaces
 * that both mark journey context should not mark it two ways.
 *
 * NO STAGE WORD AND NO NUMBER. R6 rejected "Stretch 2" and "Stage B" outright:
 * they are implementation concepts wearing UX clothes, meaningless without a
 * legend, and a legend on Today is a second thing to read before the daily
 * action. Section 8's counter ban covers the rest.
 *
 * THE FRAMEWORK WORDS NEVER REACH HERE. `phaseKey` and `destination` are keys
 * used to look up copy; what renders is always Jen's destination language.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { PHASE_DISPLAY } from '../../constants/journey';
import type { DestinationKey, PhaseKey } from '../../types/models';

const MAX_FONT_SCALE = 1.3;

export interface JourneyLineProps {
  /** The eyebrow above the short. Required; see the note in this file's header. */
  label: string;
  phaseKey: PhaseKey;
  destination: DestinationKey;
  testID?: string;
}

export const JourneyLine: React.FC<JourneyLineProps> = ({
  label,
  phaseKey,
  destination,
  testID = 'home-journey-line',
}) => (
  // ONE ACCESSIBILITY NODE, NOT TWO. Read separately, a screen reader announces
  // a bare label and then an imperative, which reproduces the exact confusion
  // the label exists to prevent. Read together they are one statement about
  // where the user is.
  <View
    style={styles.row}
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${label}. ${PHASE_DISPLAY[phaseKey][destination].short}`}
    testID={testID}
  >
    <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>
      {label}
    </Text>
    <Text
      style={styles.short}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      testID={`${testID}-short`}
    >
      {PHASE_DISPLAY[phaseKey][destination].short}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.md,
  },
  // Lifted from JourneyPhaseScreen's `state` style rather than approximated, so
  // the two eyebrows cannot drift apart by a point or a shade.
  label: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  short: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
  },
});

export default JourneyLine;
