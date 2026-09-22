// Energy hub — Four-Pillar IA Phase B-3b.
//
// Replaces EnergyHubPlaceholder as the Energy tab root. A calm home offering
// three ways to shift how you feel: Regulate / Rest / Fuel. Each card opens a
// browse list (EnergyBrowseListScreen) of the brainStateProtocols catalog
// grouped by the browseCategory field (added in B-2). Selecting a protocol
// there launches the existing player.
//
// This hub does NOT use the legacy discover/ library screens — that is a
// separate system (B-3d).

import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../../components/shared/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, SizeTokens, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import type { ProtocolBrowseCategory } from '../../types/models';
import { ScreenHeader, BAND_STRONG_SCRIM } from '../../components/shared/ScreenHeader';
import { GuidePill } from '../../components/ai/GuidePill';

// The one illustration on Energy home: a watercolor header band. Raster asset
// (WebP) rendered via ScreenHeader's expo-image layer, never an SVG icon.
const energyHeader = require('../../../assets/images/energyHeader.webp');

// How far the first category card rides up onto the header's bottom (mist) seam
// — matches Focus so the overlap reads identically across heroes.
const CARD_OVERLAP = Spacing.xl;

interface CategoryCardConfig {
  category: ProtocolBrowseCategory;
  label: string;
  descriptor: string;
  icon: string;
}

// One card per browseCategory bucket. Labels are the ratified data-tag names;
// descriptors are calm, plain-language, conditional (no metrics, no claims).
const CATEGORIES: CategoryCardConfig[] = [
  {
    category: 'regulate',
    label: 'Regulate',
    descriptor: 'Calm a busy mind and steady your system.',
    icon: 'weather-windy',
  },
  {
    category: 'rest',
    label: 'Rest',
    descriptor: 'Deep rest to recover when you feel depleted.',
    icon: 'weather-night',
  },
  {
    category: 'fuel',
    label: 'Fuel',
    descriptor: 'A gentle lift for energy and focus.',
    icon: 'white-balance-sunny',
  },
];

// ONE SECONDARY ENTRY, AND THE SECTION AROUND IT IS GONE (LEARN-REHOUSE).
//
// B-3d re-homed two library surfaces into Energy and grouped them: B-3d.2 added
// Journal (Rest / evening wind-down reflection) and B-3d.3 added the Learn
// library. LEARN IS NO LONGER HERE — the podcast library it pointed at now
// lives on the Learn TAB (`ROUTES.PillarLearn` -> `LearnHubScreen`), which is
// the IA roadmap's step 5, "re-house podcasts". The `Masterclass` AppStack
// route still exists and still renders the same content, but nothing on this
// screen links to it.
//
// So the grouping had one member left, and a "library surfaces" section holding
// a single row reads as a leftover rather than a decision. Journal is now its
// own row, written inline the way the Focus hub writes its secondary entry
// (FocusHubScreen.tsx:158-172) rather than mapped over a one-element array.
//
// ENERGY'S SECONDARY TIER IS QUIETER THAN FOCUS'S AND MUST STAY THAT WAY: the
// leading icon and the chevron are both 20 here where Focus uses 24 and no
// leading icon at all. Copying Focus's markup wholesale would silently change
// both.
const JOURNAL_ENTRY = {
  label: 'Journal',
  descriptor: 'Wind down with an evening reflection.',
  icon: 'book-outline',
} as const;

type NavigationProp = NativeStackNavigationProp<{
  EnergyBrowse: { category: ProtocolBrowseCategory };
  Journal: undefined;
}>;

export function EnergyHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="energy-hub">
        {/* The Guide pill sits inline with the title, right-aligned — off the
            art, so it never competes with the watercolor (the escape hatch from
            placing it over the band). */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Energy</Text>
          <GuidePill context={{ screen: 'energy' }} testID="energy-hub-guide" />
        </View>
        <Text style={styles.intro}>Three ways to shift how you feel.</Text>

        {/* Hero band (reuses Focus's ScreenHeader + BAND_STRONG_SCRIM). Full-bleed;
            the in-code mist scrim fades both seams into the page so there is no
            hard image edge. contentPosition="center" frames this asset's subject
            (mountain peak upper-center + river valley), which is mid-frame rather
            than lower-third like Focus. */}
        <View style={styles.header}>
          <ScreenHeader
            source={energyHeader}
            mode="band"
            scrimLocations={BAND_STRONG_SCRIM}
            contentPosition="center"
          />
        </View>

        {/* First card overlaps the header's bottom seam (matches Focus). */}
        <View style={styles.cards}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.category}
              style={styles.card}
              onPress={() =>
                navigation.navigate(ROUTES.EnergyBrowse, { category: c.category })
              }
              accessibilityRole="button"
              accessibilityLabel={`${c.label}. ${c.descriptor}`}
              testID={`energy-hub-card-${c.category}`}
            >
              <View style={styles.cardIcon}>
                <Icon name={c.icon as any} size={24} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{c.label}</Text>
                <Text style={styles.cardDescriptor}>{c.descriptor}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.mutedSageGray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Journal, the one library surface still homed here (B-3d.2). Quieter
            than the three category cards above so the "three ways" framing
            stays primary. The testID is unchanged from when this was a mapped
            section: a test and the device walk both name it. */}
        <TouchableOpacity
          style={styles.secondaryRow}
          onPress={() => navigation.navigate('Journal')}
          accessibilityRole="button"
          accessibilityLabel={`${JOURNAL_ENTRY.label}. ${JOURNAL_ENTRY.descriptor}`}
          testID="energy-hub-secondary-journal"
        >
          <Icon name={JOURNAL_ENTRY.icon as any} size={20} color={Colors.mutedSageGray} />
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryLabel}>{JOURNAL_ENTRY.label}</Text>
            <Text style={styles.cardDescriptor}>{JOURNAL_ENTRY.descriptor}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={Colors.mutedSageGray} />
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
  // Title + Guide pill share one row; the pill is right-aligned and off the
  // hero band. alignItems center vertically centers the pill against the title
  // (matches Focus).
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
    // Tight gap so the title/subtitle and the header band read as one unit
    // (matches Focus).
    marginBottom: Spacing.xs,
  },
  header: {
    // Full-bleed: cancel the ScrollView's horizontal padding on BOTH edges so
    // the band runs edge to edge. ScreenHeader has no fixed width, so the
    // negative margins stretch it the full screen width with no right-edge clip.
    marginHorizontal: -Spacing.lg,
  },
  cards: {
    gap: Spacing.md,
    // Ride the first card up onto the header's bottom (mist) seam. zIndex keeps
    // the cards above the band; the opaque card surface reads over the seam.
    marginTop: -CARD_OVERLAP,
    zIndex: 1,
  },
  card: {
    minHeight: SizeTokens.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  cardIcon: {
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  cardDescriptor: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
  // The Journal entry: de-emphasized vs the category cards — no border/surface
  // fill, smaller icon, lighter label.
  //
  // `secondary`, the section wrapper, went with the grouping (LEARN-REHOUSE).
  // It carried `marginTop: Spacing.xl` and a `gap` that had nothing left to
  // space; the margin moves here so the row keeps its distance from the cards
  // above. minHeight stays: 16's touch-target floor applies to a lone row
  // exactly as it did to a grouped one.
  secondaryRow: {
    marginTop: Spacing.xl,
    minHeight: SizeTokens.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  secondaryText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  secondaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
});
