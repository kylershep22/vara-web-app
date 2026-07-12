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
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import type { ProtocolBrowseCategory } from '../../types/models';
import { ScreenHeader, BAND_STRONG_SCRIM } from '../../components/shared/ScreenHeader';

// The one illustration on Energy home: a watercolor header band. Raster asset
// (WebP) rendered via ScreenHeader's expo-image layer, never an SVG icon.
const energyHeader = require('../../../assets/images/energyHeader.webp');

const MIN_TOUCH_TARGET = 48;
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

// Secondary entries below the three protocol categories. These are not "ways to
// shift how you feel" (the three cards above) — they are the library surfaces
// re-homed into Energy by the Four-Pillar IA. B-3d.2 adds Journal (Rest /
// evening wind-down reflection); B-3d.3 adds the Learn library (Masterclass).
interface SecondaryEntry {
  id: string;
  route: 'Journal' | 'Masterclass';
  label: string;
  descriptor: string;
  icon: string;
}

const SECONDARY_ENTRIES: SecondaryEntry[] = [
  {
    id: 'journal',
    route: 'Journal',
    label: 'Journal',
    descriptor: 'Wind down with an evening reflection.',
    icon: 'book-outline',
  },
  {
    id: 'learn',
    route: 'Masterclass',
    label: 'Learn',
    descriptor: 'Short lessons on how your brain works.',
    icon: 'school-outline',
  },
];

type NavigationProp = NativeStackNavigationProp<{
  EnergyBrowse: { category: ProtocolBrowseCategory };
  Journal: undefined;
  Masterclass: undefined;
}>;

export function EnergyHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="energy-hub">
        <Text style={styles.title}>Energy</Text>
        <Text style={styles.intro}>Three ways to shift how you feel.</Text>

        {/* Hero band (reuses Focus's ScreenHeader + BAND_STRONG_SCRIM). Full-bleed;
            the in-code mist scrim fades both seams into the page so there is no
            hard image edge. contentPosition="center" frames this asset's subject
            (mountain peak upper-center + river valley), which is mid-frame rather
            than lower-third like Focus. */}
        <ScreenHeader
          source={energyHeader}
          mode="band"
          scrimLocations={BAND_STRONG_SCRIM}
          contentPosition="center"
          style={styles.header}
        />

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

        {/* Library surfaces re-homed into Energy (B-3d). Quieter than the three
            category cards above so the "three ways" framing stays primary. */}
        <View style={styles.secondary}>
          {SECONDARY_ENTRIES.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.secondaryRow}
              onPress={() => navigation.navigate(e.route)}
              accessibilityRole="button"
              accessibilityLabel={`${e.label}. ${e.descriptor}`}
              testID={`energy-hub-secondary-${e.id}`}
            >
              <Icon name={e.icon as any} size={20} color={Colors.mutedSageGray} />
              <View style={styles.secondaryText}>
                <Text style={styles.secondaryLabel}>{e.label}</Text>
                <Text style={styles.cardDescriptor}>{e.descriptor}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.mutedSageGray} />
            </TouchableOpacity>
          ))}
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
    minHeight: MIN_TOUCH_TARGET,
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
  // Secondary entries (re-homed library surfaces): de-emphasized vs the category
  // cards — no border/surface fill, smaller icon, lighter label.
  secondary: {
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  secondaryRow: {
    minHeight: MIN_TOUCH_TARGET,
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
