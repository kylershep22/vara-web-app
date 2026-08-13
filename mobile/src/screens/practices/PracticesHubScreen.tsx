// Practices tab root — IA restructure steps 4a + 4b-i + 4b-ii-a. COMPLETE.
//
// A LAUNCHER, not a page: one card per pillar, each opening a surface that
// already exists and already works. It holds no state, reads no data, and
// renders nothing of its own beyond the cards. A doorway, not a destination.
//
// FOUR cards, all live — the full pillar set:
//   Focus & Time    → ROUTES.PillarFocus          (FocusHubScreen)
//   Energy          → ROUTES.PillarEnergy         (EnergyHubScreen)
//   Routines        → NAV_TARGETS.plan            (the routine builder)  [4b-i]
//   Stress Recovery → ROUTES.PillarStressRecovery (net-new)          [4b-ii-a]
//
// Every card was held back until its destination existed, which is why the set
// arrived over three slices rather than one. ComingSoonCard was considered and
// rejected for the waiting pillars each time — it is the right answer for a
// planned tool sitting among live ones on a pillar page (see FocusHubScreen),
// and the wrong answer for a launcher whose entire promise is that every card
// goes somewhere.
//
// STRESS RECOVERY IS A CROSS-LIST (4b-ii-a). Its page lists the same practices
// Energy already offers under Regulate and Rest — nothing moved, and Energy is
// unchanged. The card's descriptor is doing the real work: it names the moment
// (stress spiking, now) where Energy names the mechanism. See
// StressRecoveryScreen's header comment for why that framing is the feature.
//
// THE ROUTINES CARD IS WIRING, NOT A NEW PAGE (4b-i). It points at the surface
// the dashboard's "Today's routine" card already opens — NAV_TARGETS.plan with
// `{ tab: 'routines' }` — so both entry points land on the same builder, in the
// same state, with no second implementation to keep in sync. Nothing about that
// destination changes in this slice.
//
// Worth stating plainly, because the routing reads as indirect: NAV_TARGETS.plan
// resolves to ROUTES.PillarTime, which AppNavigator registers as PlanScreen
// (AppNavigator.tsx:881). PlanScreen hosts the routine builder on its `routines`
// sub-tab (PlanScreen.tsx:301 → RoutinesTab → RoutineEditor). The builder is NOT
// a separate screen, and this card does not make it one.
//
// Why NAV_TARGETS.plan and not ROUTES.PillarTime directly, when the two cards
// above name their ROUTES entries: every other caller that deep-links into
// routines goes through NAV_TARGETS.plan (8 sites: the dashboard CTAs, the
// check-in hand-off, the routine-reminder tap). Naming the alias keeps this card
// in lockstep with them if that destination ever moves, which is the whole
// reason navTargets.ts exists. Focus and Energy have no alias to name.
//
// RESTORES FOCUS. FocusHubScreen and FocusRhythmsScreen have been unreachable
// since step 2 dropped the Focus tab: nothing navigated to ROUTES.PillarFocus,
// so the hub was registered nowhere and its only child went dark with it. The
// first card below is the entry point that brings both back. FocusRhythms is
// still reached from inside the Focus hub, exactly as before and unchanged.
//
// CARD PATTERN. EnergyHubScreen's category list (config array → icon + label +
// descriptor + chevron row), which is also the shape of the Focus hub's own
// secondary row. Still copied locally rather than extracted.
//
// 4a said that cleanup "belongs to a later pass with all four cards in place",
// and the four cards are now in place — so, explicitly: STILL DEFERRED, and no
// longer waiting on the card count. Extracting this row means editing
// EnergyHubScreen, which 4b-ii-a is fenced out of (Energy stays unchanged while
// Stress Recovery cross-lists its practices). It is a standalone tidy-up now,
// not a milestone. The list ROW on the pillar pages did get extracted this
// slice — components/protocol/ProtocolListItem — because a second surface
// genuinely needed it; this hub row still has only the one implementation
// worth sharing with.
//
// No Guide pill. The step-2 shell left it off because there was no surface to
// describe, and a doorway still is not one however many cards it holds — each
// pillar hub carries its own pill on arrival. 4a said "revisit when the hub has
// four cards and content of its own": the cards are here, the content of its
// own is not, so the answer is unchanged.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { NAV_TARGETS } from '../../navigation/navTargets';

// [COPY GAP] markers render ON SCREEN, per the weekly-loop convention: nobody
// should mistake a walkthrough build for finished product. Removing a marker is
// a copy decision and belongs to Jen. Card LABELS carry the marker too: all four
// are the roadmap's working pillar names, which is not the same thing as
// approved user-facing copy. "Stress Recovery" especially — the roadmap flags it
// as a feature-set label that must not read as a return to
// stress-recovery-as-a-category.
const gap = (text: string) => `[COPY GAP] ${text}`;

const MIN_TOUCH_TARGET = 48;

// All four destinations are AppStack screens, siblings of the tab navigator
// rather than children of it, so these navigate calls bubble up out of the tab
// context and PUSH. Same mechanism as the Energy hub's Journal / Masterclass
// rows. Pushing is what gives every card a working back path to Practices.
//
// The Routines entry is written as a MAPPED type keyed off NAV_TARGETS.plan
// rather than as a literal `PillarTime:` key. The alias is flag-dependent
// (navTargets.ts:34), so hardcoding one side of it here would silently stop
// type-checking the other. Same idiom, same reason, as CheckInFlowScreen.tsx:72.
type NavigationProp = NativeStackNavigationProp<
  {
    PillarFocus: undefined;
    PillarEnergy: undefined;
    PillarStressRecovery: undefined;
  } & { [K in typeof NAV_TARGETS.plan]: { tab: 'routines' } }
>;

interface PillarCardConfig {
  id: string;
  label: string;
  descriptor: string;
  icon: string;
  /**
   * Where the card goes. A thunk rather than a bare route name because Routines
   * needs a param (`{ tab: 'routines' }`) the other two do not, and a single
   * `navigate(route, params)` call over a union of route names does not
   * type-check — React Navigation's overloads cannot pair the right params with
   * the right name once the name is a union. The alternative was one cast at the
   * boundary (the NotificationContext.tsx:190 idiom); a thunk was preferred here
   * because it keeps every destination's params checked against its own route
   * with no cast at all.
   */
  go: (navigation: NavigationProp) => void;
}

// Order is the designed pillar order, not alphabetical and not arbitrary: Focus
// & Time first, Energy second, Routines third. Stress Recovery is fourth when
// its page lands, so this array is appended to, never resorted.
//
// Each descriptor echoes what its destination actually offers, so the card
// promises what the surface then delivers rather than introducing a second
// description of the same pillar. All three are noun phrases in the same
// register, deliberately: a card that switched to an imperative would read as
// the loudest one on the page.
//
// Routines' descriptor does NOT echo its destination's own subtitle, which is
// the one exception. FocusCopy.routinesSubtitle reads "Build routines that
// support your brain" — brain-led framing, which the v2 outcomes-led sweep
// retired from hub and headline copy (see brandCopyGuard's
// RETIRED_POSITIONING_PATTERNS). Fixing that string is a copy change inside
// PlanScreen's surface and belongs to Jen, not to this wiring slice; the card
// simply does not repeat it.
const PILLARS: PillarCardConfig[] = [
  {
    id: 'focus-time',
    label: gap('Focus & Time'),
    descriptor: gap('Protected time for one thing at a time.'),
    icon: 'target',
    go: (navigation) => navigation.navigate(ROUTES.PillarFocus),
  },
  {
    id: 'energy',
    label: gap('Energy'),
    descriptor: gap('Ways to shift how you feel.'),
    icon: 'white-balance-sunny',
    go: (navigation) => navigation.navigate(ROUTES.PillarEnergy),
  },
  {
    id: 'routines',
    label: gap('Routines'),
    descriptor: gap('The sequences your days run on.'),
    // Echoes the dashboard routine card's own icon (RoutineCard.tsx:45), so the
    // same concept carries the same mark on both surfaces that open it.
    icon: 'clipboard-check-outline',
    // The `tab` param is load-bearing: PlanScreen defaults to its habits
    // sub-tab, so a card labelled Routines that omitted it would land the user
    // on habits. Same param, same reason, as the dashboard routine CTA
    // (DashboardScreen.tsx:424) and the routine-reminder tap
    // (NotificationContext.tsx:203).
    go: (navigation) => navigation.navigate(NAV_TARGETS.plan, { tab: 'routines' }),
  },
  {
    id: 'stress-recovery',
    label: gap('Stress Recovery'),
    // The one descriptor that has to work harder than the others. Every
    // practice behind this card also sits under Energy, so the descriptor is
    // what tells someone why they would tap here instead — it names the MOMENT
    // (activated, now) rather than the mechanism (regulation), which is the
    // whole basis of the cross-list. See StressRecoveryScreen's header comment.
    descriptor: gap('Something to reach for when stress spikes.'),
    icon: 'lifebuoy',
    go: (navigation) => navigation.navigate(ROUTES.PillarStressRecovery),
  },
];

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
              onPress={() => p.go(navigation)}
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
