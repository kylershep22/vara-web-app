/**
 * The pre-pick hero (roadmap 3b-ii-b). What Home shows before today has been
 * answered.
 *
 * IT REPLACES THE HERO, NOT THE CARD. Everything below it on Home (continuity,
 * the weekly close entry, the content cards) renders exactly as it does after a
 * pick. The day's action is the only thing that depends on an answer, so it is
 * the only thing that waits for one.
 *
 * AN ALL-DAY RESTING STATE, NOT A PRE-MODAL FLASH. Skipping the picker is a
 * first-class answer ("not now"), so this card can sit on Home from morning to
 * bedtime. Everything about it is chosen to read the same at 4pm as at 8am.
 *
 * WHAT IT MUST NEVER LOOK LIKE, and what enforces that:
 *   - an error. No coral anywhere in this file; coral is the brand's only
 *     error colour and an unanswered day is not an error. A test asserts the
 *     absence rather than trusting the styles below to stay that way.
 *   - an outstanding task. No badge, no count, no "not yet", no exclamation,
 *     nothing that notices how long it has been there. There is no streak to
 *     break by not answering and nothing here may imply one.
 *   - a dead end. Everything below this card on Home stays live and usable,
 *     and this stays tappable all day.
 *
 * The CTA is FILLED rather than outlined, and that is deliberate even for a
 * card that may sit unanswered for hours: filled is the brand's invitation
 * weight, and an outlined control in the hero slot would read as switched off
 * rather than as waiting. Inviting is not the same as insistent.
 *
 * Deliberately a SIBLING of TodayHeroCard rather than a mode of it. That
 * component's whole body assumes a protocol and is pinned by its own tests;
 * threading a nullable protocol through it would put a branch on almost every
 * line and make two states share one set of assertions.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { PICKER_COPY } from '../../screens/weekly/copy';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;

export interface SetTodayCardProps {
  onPress: () => void;
}

export const SetTodayCard: React.FC<SetTodayCardProps> = ({ onPress }) => (
  <View style={styles.card} testID="home-set-today">
    <CardHeading icon="white-balance-sunny" title={PICKER_COPY.promptHeading} />

    <Text style={styles.body}>{PICKER_COPY.promptBody}</Text>

    {/* Filled, because this IS the one primary action on Home until the day is
        answered. It hands the slot straight back to the day's action. */}
    <TouchableOpacity
      style={styles.cta}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={PICKER_COPY.promptCta}
      testID="home-set-today-open"
    >
      <Text style={styles.ctaLabel}>{PICKER_COPY.promptCta}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    marginBottom: Spacing.base,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});
