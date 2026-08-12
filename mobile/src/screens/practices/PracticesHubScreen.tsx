// Practices tab root — IA restructure step 4a.
//
// A LAUNCHER, not a page: one card per pillar, each opening a pillar hub that
// already exists and already works as a pushed screen. It holds no state, reads
// no data, and renders nothing of its own beyond the cards. A doorway, not a
// destination.
//
// TWO cards this slice, both live:
//   Focus & Time → ROUTES.PillarFocus  (FocusHubScreen)
//   Energy       → ROUTES.PillarEnergy (EnergyHubScreen)
//
// Routines & Systems and Stress Recovery are the remaining two pillars in the
// designed order. They are deliberately ABSENT rather than present-and-inert:
// their pages do not exist yet, and a card that opens nothing is a dead end.
// ComingSoonCard was considered and rejected here — it is the right answer for a
// planned tool sitting among live ones on a pillar page (see FocusHubScreen),
// and the wrong answer for a launcher whose entire promise is that every card
// goes somewhere. The two land in 4b when their pages do.
//
// RESTORES FOCUS. FocusHubScreen and FocusRhythmsScreen have been unreachable
// since step 2 dropped the Focus tab: nothing navigated to ROUTES.PillarFocus,
// so the hub was registered nowhere and its only child went dark with it. The
// first card below is the entry point that brings both back. FocusRhythms is
// still reached from inside the Focus hub, exactly as before and unchanged.
//
// CARD PATTERN. EnergyHubScreen's category list (config array → icon + label +
// descriptor + chevron row), which is also the shape of the Focus hub's own
// secondary row. Copied locally rather than extracted to a shared component:
// extraction would mean editing both pillar hubs, and this slice re-homes them
// as-is. That cleanup belongs to a later pass with all four cards in place.
//
// No Guide pill. The step-2 shell left it off because there was no surface to
// describe; a two-card doorway is still not one, and each pillar hub carries its
// own pill on arrival. Revisit when the hub has four cards and content of its
// own, not before.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';

// [COPY GAP] markers render ON SCREEN, per the weekly-loop convention: nobody
// should mistake a walkthrough build for finished product. Removing a marker is
// a copy decision and belongs to Jen. Card LABELS carry the marker too: "Focus &
// Time" and "Energy" are the roadmap's working pillar names, which is not the
// same thing as approved user-facing copy.
const gap = (text: string) => `[COPY GAP] ${text}`;

const MIN_TOUCH_TARGET = 48;

interface PillarCardConfig {
  id: string;
  route: typeof ROUTES.PillarFocus | typeof ROUTES.PillarEnergy;
  label: string;
  descriptor: string;
  icon: string;
}

// Order is the designed pillar order, not alphabetical and not arbitrary: Focus
// & Time first, Energy second. Routines & Systems and Stress Recovery are third
// and fourth when their pages land, so this array is appended to, never resorted.
//
// Each descriptor echoes its destination's own intro line, so the card promises
// what the page then says rather than introducing a second description of the
// same pillar.
const PILLARS: PillarCardConfig[] = [
  {
    id: 'focus-time',
    route: ROUTES.PillarFocus,
    label: gap('Focus & Time'),
    descriptor: gap('Protected time for one thing at a time.'),
    icon: 'target',
  },
  {
    id: 'energy',
    route: ROUTES.PillarEnergy,
    label: gap('Energy'),
    descriptor: gap('Ways to shift how you feel.'),
    icon: 'white-balance-sunny',
  },
];

// Both destinations are AppStack screens, siblings of the tab navigator rather
// than children of it, so these navigate calls bubble up out of the tab context
// and PUSH. Same mechanism as the Energy hub's Journal / Masterclass rows.
type NavigationProp = NativeStackNavigationProp<{
  PillarFocus: undefined;
  PillarEnergy: undefined;
}>;

export function PracticesHubScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="practices-hub">
        <View style={styles.titleRow}>
          <Text style={styles.title}>Practices</Text>
        </View>
        <Text style={styles.intro}>{gap('Pick a place to start.')}</Text>

        <View style={styles.cards}>
          {PILLARS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => navigation.navigate(p.route)}
              accessibilityRole="button"
              accessibilityLabel={`${p.label}. ${p.descriptor}`}
              testID={`practices-hub-card-${p.id}`}
            >
              <View style={styles.cardIcon}>
                <Icon name={p.icon as any} size={24} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{p.label}</Text>
                <Text style={styles.cardDescriptor}>{p.descriptor}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.mutedSageGray} />
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
  },
  // No hero band on this screen (there is no Practices art, and a launcher does
  // not need one), so the cards start on normal page rhythm rather than riding
  // up onto a seam the way the Focus and Energy hubs' first cards do.
  cards: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
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
});

export default PracticesHubScreen;
