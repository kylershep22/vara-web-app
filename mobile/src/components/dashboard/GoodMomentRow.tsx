/**
 * Good moments — the below-fold row on Today (journey slice 8).
 *
 * A ROW, NOT A CARD, on the StartHereRow pattern. UI Standards 11.E gives Today
 * a three-card ceiling above the fold and this sits below it; either way, a
 * fourth card competing with the hero is the thing the ceiling exists to
 * prevent. No surface, no border, no radius, no shadow: it reads as a line of
 * the page.
 *
 * IT READS AS A CONTROL, AND THAT IS THE ONE THING IT HAS TO GET RIGHT.
 * TODAY-CARD-AFFORDANCES is an open before-beta row about the opposite failure
 * one screen up — a protocol title on the Today card that reads as a control
 * and is not one. The inverse is just as bad: an action that reads as a
 * heading is an action nobody takes. Three things carry it, and none of them is
 * sufficient alone. The leading `plus-circle-outline` is an unambiguous add
 * affordance. The label is Evergreen Teal rather than Charcoal, which is this
 * app's interactive colour. And `accessibilityRole="button"` says it outright
 * to anyone not looking at the colour.
 *
 * ONE STATE, ALWAYS. The row is byte-identical whether the user has saved
 * nothing today or five things. No count, no tick, no "added" variant, no
 * change of weight. That is not a simplification of a richer design: roadmap
 * section 8 says the feature is "one tap, optional, never counted", and a row
 * that changed after the first save would be counting to one in public. It is
 * also why this component takes no data prop and performs no read — there is
 * nothing it could ask that it is allowed to act on.
 *
 * NO VISIBLE ZERO AND NO EMPTY STATE, for the same reason. 14.2's three-state
 * rule wants something, nothing-yet, or absent; this surface is deliberately
 * none of them, because it never reports a quantity at all.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import Text from '../shared/Text';
import { Colors, SizeTokens, Spacing, Typography } from '../../constants';
import { GOOD_MOMENT_ROW_LABEL } from './goodMoments.copy';

export interface GoodMomentRowProps {
  onPress: () => void;
  testID?: string;
}

export const GoodMomentRow: React.FC<GoodMomentRowProps> = ({
  onPress,
  testID = 'good-moment-row',
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={GOOD_MOMENT_ROW_LABEL}
    accessibilityHint="Opens a sheet to write one good moment"
    testID={testID}
  >
    <View style={styles.icon}>
      <Icon name="plus-circle-outline" size={24} color={Colors.evergreenTeal} />
    </View>
    <Text
      style={styles.label}
      maxFontSizeMultiplier={Typography.maxFontScale}
      testID={`${testID}-label`}
    >
      {GOOD_MOMENT_ROW_LABEL}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // The 48 floor is not negotiable and is not part of any de-emphasis
  // (UI Standards 16). StartHereRow's shape exactly.
  row: {
    minHeight: SizeTokens.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.md,
  },
  // Teal and semibold. Charcoal here would read as a section heading, which is
  // the failure mode named in this file's header.
  label: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
});

export default GoodMomentRow;
