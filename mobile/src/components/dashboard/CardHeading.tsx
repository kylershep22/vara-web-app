// CardHeading — the shared dashboard card header.
//
// A 28px Dew Sage rounded-square icon tile beside the card's heading block.
// Introduced with the weekly habit grid restyle and back-applied to the insight
// and routine cards, so no card looks like the only designed element on Home.
// It lives here rather than as inline styles in three files because it is about
// to be a design-system element.
//
// Two shapes:
//   <CardHeading icon="…" title="This week" />        — a plain title
//   <CardHeading icon="…">{…}</CardHeading>           — a stacked heading block
//
// The tile is decorative: it is hidden from screen readers, so a card's
// announcement is unchanged by adopting this component.

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Layout, Spacing, Typography } from '../../constants';

interface CardHeadingProps {
  /** Glyph from the existing MaterialCommunityIcons set. */
  icon: React.ComponentProps<typeof Icon>['name'];
  /** Plain-title form. Ignored when children are provided. */
  title?: string;
  /** Stacked-block form — e.g. an eyebrow above a content title. */
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  titleTestID?: string;
}

export const CardHeading: React.FC<CardHeadingProps> = ({
  icon,
  title,
  children,
  style,
  testID,
  titleTestID,
}) => (
  <View style={[styles.row, style]} testID={testID}>
    <View
      style={styles.tile}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={icon} size={16} color={Colors.evergreenTeal} />
    </View>

    <View style={styles.block}>
      {children ?? (
        <Text style={styles.title} testID={titleTestID}>
          {title}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tile: {
    width: 28,
    height: 28,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    flex: 1,
  },
  // Matches the existing sibling card titles exactly (InsightCard and
  // RoutineCard both use fontSize.lg / semibold / softCharcoal — the design
  // system's H3 card-title spec). Deliberately NOT a bespoke 15.5px: that size
  // is not in the scale, and inventing a token is worse than a slightly-off one.
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
});
