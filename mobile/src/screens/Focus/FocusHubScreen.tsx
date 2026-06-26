// Focus hub — Four-Pillar IA Phase B-3c (the launch wedge).
//
// Replaces FocusScreen as the PillarFocus tab root. A calm home with a single
// primary action: set a focus, which opens the existing Pomodoro timer
// (FocusTimer stack screen). A quieter secondary entry captures when focus
// comes easiest (FocusRhythmsScreen).
//
// Built to the EnergyHubScreen precedent. No streaks, no counts, no stats: the
// only outcome is a felt one, surfaced by the post-timer reflection, never a
// metric on this page.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';

const MIN_TOUCH_TARGET = 48;

type NavigationProp = NativeStackNavigationProp<{
  FocusTimer: { fromHub?: boolean } | undefined;
  FocusRhythms: undefined;
}>;

export function FocusHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="focus-hub">
        <Text style={styles.title}>Focus</Text>
        <Text style={styles.intro}>Protected time for one thing at a time.</Text>

        {/* Primary action: whole-card tappable (no inner button, per the card
            rule). Opens the existing Pomodoro timer. */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => navigation.navigate(ROUTES.FocusTimer, { fromHub: true })}
          accessibilityRole="button"
          accessibilityLabel="Set a focus. Choose a length and give a single task your full attention."
          testID="focus-hub-card-primary"
        >
          <Text style={styles.primaryEyebrow}>Deep work</Text>
          <Text style={styles.primaryHeading}>Set a focus</Text>
          <Text style={styles.primaryBody}>
            Choose a length, settle in if you need to, and give a single task
            your full attention.
          </Text>
        </TouchableOpacity>

        {/* Secondary, quieter list-item entry. */}
        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => navigation.navigate(ROUTES.FocusRhythms)}
          accessibilityRole="button"
          accessibilityLabel="Focus rhythms. Notice when focus comes easiest for you."
          testID="focus-hub-card-rhythms"
        >
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryLabel}>Focus rhythms</Text>
            <Text style={styles.secondaryDescriptor}>
              Notice when focus comes easiest for you.
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.mutedSageGray} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xl,
  },
  primaryCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  primaryEyebrow: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    color: Colors.evergreenTeal,
    marginBottom: 6,
  },
  primaryHeading: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 8,
  },
  primaryBody: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
  },
  secondaryCard: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  secondaryText: {
    flex: 1,
  },
  secondaryLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  secondaryDescriptor: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
});

export default FocusHubScreen;
