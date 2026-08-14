/**
 * The standing "open your week" affordance on Home.
 *
 * CLOSES THE DECLINED-OPEN GAP. Home pushes the weekly open once per target
 * (see DashboardScreen), deliberately not on every focus, because re-pushing
 * would trap a user who backed out with no way into the rest of the app. The
 * cost of that latch is that a user who declines has no route back in. This
 * card is that route: the same entry the guard would have pushed, offered as a
 * card rather than forced as a redirect.
 *
 * Home must never be a dead end with no cycle. That is the whole reason this
 * exists, so do not gate it behind anything more than "the guard says 'open'".
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;

// Placeholder pending Jen, marked like the rest of the weekly copy.
const COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  heading: 'Start your week',
  // COPY: draft, not from guidelines doc - pending Jen
  body:
    'Pick what you want more of and how much room the week has. It takes about a minute.',
  // COPY: draft, not from guidelines doc - pending Jen
  cta: 'Open your week',
} as const;

export interface OpenYourWeekCardProps {
  onOpen: () => void;
}

export const OpenYourWeekCard: React.FC<OpenYourWeekCardProps> = ({ onOpen }) => (
  <View style={styles.card} testID="home-open-week">
    <CardHeading icon="calendar-start" title={COPY.heading} />
    <Text style={styles.body}>{COPY.body}</Text>
    <TouchableOpacity
      style={styles.cta}
      onPress={onOpen}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={COPY.cta}
      testID="home-open-week-cta"
    >
      <Text style={styles.ctaLabel}>{COPY.cta}</Text>
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
