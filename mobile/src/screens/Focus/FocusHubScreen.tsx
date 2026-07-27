// Focus hub — Four-Pillar IA Phase B-3c (the launch wedge).
//
// Replaces FocusScreen as the PillarFocus tab root. A calm home with a single
// primary action: set a focus, which opens the existing Pomodoro timer
// (FocusTimer stack screen). A quieter secondary entry captures when focus
// comes easiest (FocusRhythmsScreen). Below those, the planned focus tools sit
// as inert coming-soon cards so the shape of the pillar is visible without
// anything pretending to be tappable.
//
// Built to the EnergyHubScreen precedent. No streaks, no counts, no stats: the
// only outcome is a felt one, surfaced by the post-timer reflection, never a
// metric on this page.

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { ScreenHeader, BAND_STRONG_SCRIM } from '../../components/shared/ScreenHeader';
import { ComingSoonCard } from '../../components/shared/ComingSoonCard';
import { GuidePill } from '../../components/ai/GuidePill';
import { useAuth } from '../../context/AuthContext';
import { getFocusRhythms } from '../../services/firebase/focusRhythms.service';
import { logger } from '../../utils/logger';
import {
  RHYTHM_INVITATION,
  RHYTHM_IN_WINDOW_LINE,
  isRhythmActiveNow,
  rhythmSummary,
} from './rhythmRecall';

// The one illustration on Focus home: a watercolor header band. Raster asset
// (WebP) rendered via ScreenHeader's expo-image layer, never an SVG icon.
const focusHeader = require('../../../assets/images/focusHeader.webp');

const MIN_TOUCH_TARGET = 48;
// How far the primary card rides up onto the header's bottom (mist) seam.
const CARD_OVERLAP = Spacing.xl;

type NavigationProp = NativeStackNavigationProp<{
  FocusTimer: { fromHub?: boolean } | undefined;
  FocusRhythms: undefined;
}>;

export function FocusHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  // The user's stored rhythms, plus the hour they were last read at. Both are
  // refreshed on screen focus rather than ticked live: the hub is a tab root
  // that stays mounted, so returning from FocusRhythmsScreen (or from anywhere
  // else, later in the day) is exactly when a stale read would show.
  const [windows, setWindows] = useState<string[]>([]);
  const [hour, setHour] = useState(() => new Date().getHours());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setHour(new Date().getHours());
      if (!user) {
        setWindows([]);
        return;
      }
      getFocusRhythms(user.uid)
        .then((stored) => {
          if (active) setWindows(stored);
        })
        // Best effort: a read failure just leaves the invitation copy in place.
        .catch((error) => logger.error('[FocusHub] rhythms load failed:', error));
      return () => {
        active = false;
      };
    }, [user])
  );

  const summary = rhythmSummary(windows);
  const rhythmsBody = summary ?? RHYTHM_INVITATION;
  const inRhythmNow = isRhythmActiveNow(windows, hour);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="focus-hub">
        {/* Band mode: the screen owns the title/subtitle, above the header. The
            Guide pill sits inline with the title, right-aligned — off the art,
            so it never competes with the watercolor (the escape hatch from
            placing it over the band). */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Focus</Text>
          <GuidePill context={{ screen: 'focus' }} testID="focus-hub-guide" />
        </View>
        <Text style={styles.intro}>Protected time for one thing at a time.</Text>

        {/* The single hero illustration. Full-bleed band; the in-code mist scrim
            fades both seams into the page so there is no hard image edge. */}
        <View style={styles.header}>
          <ScreenHeader
            source={focusHeader}
            mode="band"
            scrimLocations={BAND_STRONG_SCRIM}
          />
        </View>

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

        {/* A present-tense observation, shown only when the clock is inside a
            window the user set. Plain text on the wash, subordinate to the
            primary card above it: not a card, not a CTA, nothing to tap. When
            the hour matches nothing, the correct output is silence, so there is
            no "not your window" counterpart. */}
        {inRhythmNow && (
          <Text style={styles.rhythmNote} testID="focus-hub-rhythm-note">
            {RHYTHM_IN_WINDOW_LINE}
          </Text>
        )}

        {/* Secondary, quieter list-item entry. Its body reflects the user's own
            stored rhythms back once they have set any. */}
        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => navigation.navigate(ROUTES.FocusRhythms)}
          accessibilityRole="button"
          accessibilityLabel={`Focus rhythms. ${rhythmsBody}`}
          testID="focus-hub-card-rhythms"
        >
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryLabel}>Focus rhythms</Text>
            <Text style={styles.secondaryDescriptor}>{rhythmsBody}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.mutedSageGray} />
        </TouchableOpacity>

        {/* Planned focus tools. Inert placeholders, not dead buttons: they hold
            their place in the launcher so the shape of the pillar is honest,
            without implying a tap does something. See ComingSoonCard. */}
        <View style={styles.plannedGroup}>
          <ComingSoonCard
            title="Time blocking"
            body="Shape the day into a few protected blocks."
            testID="focus-hub-card-time-blocking"
          />
          <ComingSoonCard
            title="Task batching"
            body="Group similar work so you switch less."
            testID="focus-hub-card-task-batching"
          />
        </View>
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
    // Comfortable bottom breathing room (the Guide is a top-right pill now).
    paddingBottom: Spacing['2xl'],
  },
  // Title + Guide pill share one row; the pill is right-aligned and off the
  // hero band. alignItems center vertically centers the pill against the title.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
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
  // The in-window observation. Sits in the gap between the primary card and the
  // rhythms row, as unstyled body text on the page wash so it can never be
  // mistaken for a second primary action.
  rhythmNote: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  // Spacing lives on the group, not on the live rows above it, so the rhythms
  // row's own styling stays exactly as shipped.
  plannedGroup: {
    marginTop: Spacing.md,
    gap: Spacing.md,
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
