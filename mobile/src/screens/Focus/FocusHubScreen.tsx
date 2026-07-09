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

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { FAB_SCROLL_CLEARANCE } from '../../constants/fabLayout';
import { ScreenHeader } from '../../components/shared/ScreenHeader';

// The one illustration on Focus home: a watercolor header band. Raster asset
// (WebP) rendered via ScreenHeader's expo-image layer, never an SVG icon.
const focusHeader = require('../../../assets/images/focusHeader.webp');

const MIN_TOUCH_TARGET = 48;
// How far the primary card rides up onto the header's bottom (mist) seam.
const CARD_OVERLAP = Spacing.xl;

// EXPERIMENTAL (Slice B on-device eval): a deliberately stronger-artwork scrim,
// Focus-home ONLY. It pulls the top wash off entirely (top stop at 0) and pushes
// the bottom-transparent stop later (0.7 -> 0.82) so more of the real watercolor
// — the sun + hills that sit in the lower third — reveals. Only the scrim moves:
// the Image keeps contentFit/contentPosition and has no opacity/tint/filter. The
// bottom fade (0.82 -> 1) is kept for the card overlap. The shared ScreenHeader
// default is untouched, so no other hero is affected. Revert = delete this const
// and the scrimLocations prop below (one line).
const FOCUS_STRONG_SCRIM = [0, 0, 0.82, 1] as const;

type NavigationProp = NativeStackNavigationProp<{
  FocusTimer: { fromHub?: boolean } | undefined;
  FocusRhythms: undefined;
}>;

export function FocusHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="focus-hub">
        {/* Band mode: the screen owns the title/subtitle, above the header. */}
        <Text style={styles.title}>Focus</Text>
        <Text style={styles.intro}>Protected time for one thing at a time.</Text>

        {/* The single hero illustration. Full-bleed band; the in-code mist scrim
            fades both seams into the page so there is no hard image edge. */}
        <ScreenHeader
          source={focusHeader}
          mode="band"
          scrimLocations={FOCUS_STRONG_SCRIM}
          style={styles.header}
        />

        {/* Primary action: whole-card tappable (no inner button, per the card
            rule). Overlaps the header's bottom seam. Opens the Pomodoro timer. */}
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
    // A3: clear the docked Guide FAB so the secondary card isn't occluded.
    paddingBottom: FAB_SCROLL_CLEARANCE,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    // Tight gap so the title/subtitle and the header band read as one unit.
    marginBottom: Spacing.xs,
  },
  header: {
    // Full-bleed: cancel the ScrollView's horizontal padding on BOTH edges so
    // the band runs edge to edge. ScreenHeader has no fixed width, so the
    // negative margins stretch it the full screen width with no right-edge clip.
    marginHorizontal: -Spacing.lg,
  },
  primaryCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
    // Ride up onto the header's bottom seam. zIndex + elevation keep the card
    // above the band on both platforms so the overlap reads.
    marginTop: -CARD_OVERLAP,
    zIndex: 1,
    ...Layout.shadow.md,
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
