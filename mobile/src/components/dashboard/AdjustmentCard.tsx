/**
 * The adjustment offer on Today, C2 (slice 7b, roadmap section 9 R5).
 *
 * IT NEVER NARRATES THE TRIGGER, AND THAT IS THE CARD'S FIRST RULE. The Content
 * Pack says it outright: "Do not tell the user that two negative weekly
 * responses triggered this." Two not_moving reads tell us the user does not
 * currently feel movement. They do NOT tell us the practices were useless, and
 * nothing on this card may say or imply either. That is why the body is
 * conditional ("if this isn't helping yet") rather than
 * declarative: a declarative version would be Vara asserting an internal state
 * it inferred from two taps.
 *
 * NO COUNT REACHES THIS COMPONENT. It takes a boolean for which body to show,
 * never the decline count it is derived from, so there is no value here that
 * COULD be rendered as a number even by accident. Section 8's ban, held at the
 * prop boundary rather than by discipline.
 *
 * TWO BODIES, ONE WORD APART. R5 rejected the "copy acknowledges the prior
 * choice" lean outright: being quoted back to yourself reads as a case file.
 * The continuity is the word "still" and nothing else, and the card does not
 * know why it is showing the second one.
 *
 * THE PRIMARY DOES NOT CHANGE ANYTHING, on the same decision-4 precedent the
 * advancement card follows. "Try a different approach" opens the phase page,
 * where the three alternatives are, and the choice is made in front of the
 * thing being chosen. A primary that applied an adjustment from here would be
 * a button acting on a menu the user had not seen.
 *
 * THE DECLINE IS A PEER ACTION AND NOT A FAILURE. "Keep going for now" gets
 * equal reach, no warning colour, no confirmation and no follow-up. It answers
 * this week, not the practice: the counter re-arms and two further consecutive
 * not_moving reads offer again.
 *
 * ONE CARD, ONE SLOT. It shares Today's single journey-action slot with the
 * capture and advancement cards; `journeyActionFor` decides which, and this
 * component never asks whether it should be here.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { ADJUST_COPY } from '../../constants/journeyCopy';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;
const MAX_FONT_SCALE = 1.3;

export interface AdjustmentCardProps {
  /**
   * Show the second offer's body rather than the first.
   *
   * A BOOLEAN, NOT AN ORDINAL AND NOT A COUNT. See the header: the card must
   * not be able to render how many times the user has been asked.
   */
  isSecondOffer: boolean;
  /** Opens the phase page, where the three alternatives are. Mutates nothing. */
  onTryDifferent: () => void;
  /** Decline. Re-arms the counter and spends one proactive offer. */
  onKeepGoing: () => void;
}

export const AdjustmentCard: React.FC<AdjustmentCardProps> = ({
  isSecondOffer,
  onTryDifferent,
  onKeepGoing,
}) => {
  const body = isSecondOffer ? ADJUST_COPY.bodySecond : ADJUST_COPY.bodyFirst;

  return (
    <View style={styles.card} testID="home-adjustment">
      {/* A compass, not a warning, an alert or an exclamation. The icon says
          there is more than one way to go, which is what the card is for. Any
          caution shape would tell the user something had gone wrong, which is
          exactly the inference the copy is written to avoid. */}
      <CardHeading icon="compass-outline" title={ADJUST_COPY.title} />

      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {body}
      </Text>

      <TouchableOpacity
        style={styles.cta}
        onPress={onTryDifferent}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={ADJUST_COPY.primary}
        accessibilityHint="Opens this part of your journey to choose a different approach"
        testID="home-adjustment-try-different"
      >
        <Text style={styles.ctaLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {ADJUST_COPY.primary}
        </Text>
      </TouchableOpacity>

      {/* Quiet and unbordered, matching the advancement card's dismiss and the
          capture card's. Staying with what they are doing is a real answer and
          never a failure state. */}
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onKeepGoing}
        accessibilityRole="button"
        accessibilityLabel={ADJUST_COPY.decline}
        testID="home-adjustment-keep-going"
      >
        <Text style={styles.dismissLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {ADJUST_COPY.decline}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    marginTop: Spacing.sm,
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
  dismiss: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});

export default AdjustmentCard;
