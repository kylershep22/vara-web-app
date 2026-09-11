/**
 * The advancement offer on Today, B2 (slice 7a).
 *
 * IT RECOGNIZES, OFFERS, AND LEAVES THE CHOICE VISIBLY THEIRS (roadmap section
 * 9 R2). Never achieve -> unlock -> reward. The card says what the user has been
 * doing, asks whether they want to look at what is next, and gives the decline
 * equal reach and zero friction.
 *
 * IT NAMES NOTHING ABOUT THE NEXT PHASE, and that is the decision rather than an
 * omission. R2: a list of contents is a pitch, and a pitch has to be sold.
 * Withholding it is what keeps the offer honest, because the user is then
 * choosing to LOOK rather than accepting a described package. The looking
 * happens on the phase page, which is Jen's approved title, gloss and body for
 * that exact phase and destination, already shipped in 5b-i.
 *
 * NO NUMBER APPEARS HERE IN ANY FORM. Not the eight, not the fourteen, not
 * exposures spent or remaining, not days in phase. Section 8's ban, and there is
 * no state of this card in which a count would be correct to show.
 *
 * THE PRIMARY DOES NOT COMMIT (decision 4). "See what's next" navigates and
 * mutates nothing; the only control in the whole flow that changes the user's
 * phase is "Start this" on the page it opens. A primary that advanced the
 * journey here would be a button claiming an outcome the user had not looked at.
 *
 * THE SECONDARY DISMISSES, AND DISMISS IS NOT DELETE. It demotes the offer to
 * the journey immediately (R3), where the map's rows already open onto the same
 * page. Declining is a peer action: no warning colour, no confirmation, no
 * follow-up nag.
 *
 * ONE CARD, ONE SLOT. It shares Today's single journey-action slot with the
 * capture card and, from 7b, the adjust card. `journeyActionFor` decides which;
 * this component never asks whether it should be here.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { ADVANCEMENT_COPY } from '../../constants/journeyCopy';
import type { AdvanceDoor } from '../../journey/derive';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;
const MAX_FONT_SCALE = 1.3;

export interface AdvancementCardProps {
  /**
   * Which door opened, and therefore which of Jen's two bodies is honest.
   *
   * NARROWED TO THE NON-NULL DOORS. A card cannot render for an offer that is
   * not due, so the null case is unrepresentable here rather than handled with
   * a fallback that would have to invent a register.
   */
  variant: Exclude<AdvanceDoor, null>;
  /** Opens the next phase's page in preview. Mutates nothing. */
  onSeeNext: () => void;
  /** Dismiss. Demotes the offer to the journey, immediately. */
  onKeepGoing: () => void;
}

export const AdvancementCard: React.FC<AdvancementCardProps> = ({
  variant,
  onSeeNext,
  onKeepGoing,
}) => {
  const copy = ADVANCEMENT_COPY[variant];

  return (
    <View style={styles.card} testID="home-advancement">
      {/* A signpost, not a trophy, a medal, a star or a checkmark. The icon
          carries the register as much as the words do, and every award shape
          would say "you earned this" underneath copy written not to. A signpost
          says a way exists and does not walk you down it. */}
      <CardHeading icon="sign-direction" title={copy.title} />

      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {copy.body}
      </Text>

      <TouchableOpacity
        style={styles.cta}
        onPress={onSeeNext}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={ADVANCEMENT_COPY.primary}
        accessibilityHint="Opens the next part of your journey to look at"
        testID="home-advancement-see-next"
      >
        <Text style={styles.ctaLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {ADVANCEMENT_COPY.primary}
        </Text>
      </TouchableOpacity>

      {/* Quiet and unbordered, matching the capture card's dismiss. Staying put
          is a real answer and never a failure state, so it gets no warning
          colour and no emphasis. */}
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onKeepGoing}
        accessibilityRole="button"
        accessibilityLabel={ADVANCEMENT_COPY.secondary}
        testID="home-advancement-keep-going"
      >
        <Text style={styles.dismissLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {ADVANCEMENT_COPY.secondary}
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

export default AdvancementCard;
