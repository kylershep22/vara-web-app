// The Practices tab root — journey slice 5a. Replaces PracticesHubScreen.
//
// THE MAP, AND THE DOORS, ON ONE SCREEN. Roadmap section 1: "Practices tab is
// the journey map: vertical stack, destination titles, visible state labels,
// one-line gloss." That is the top of this screen. Underneath it are the four
// pillar cards the launcher used to be, unchanged and still working, because
// 5a has nowhere else to put them yet.
//
// WHY BOTH, AND WHY THIS IS NOT A HALF-MIGRATION. The roadmap re-houses those
// four destinations onto PHASE DETAIL PAGES, and the detail pages are slice 5b
// (roadmap section 5, rows 5a/5b). Shipping the map alone would leave
// FocusHubScreen and StressRecoveryScreen with no caller at all: this screen is
// the ONLY navigator to ROUTES.PillarFocus and ROUTES.PillarStressRecovery in
// the whole app. That is precisely how FocusHubScreen went dark for two months
// after IA step 2, with its own unit suite green the entire time
// (AppNavigator.tsx:533, and the step-4a restore path suite). The cards stay
// until the pages that will hold them exist.
//
// THE MAP ROWS DO NOT NAVIGATE, DELIBERATELY. There is no phase detail page to
// open in 5a, so the rows carry no chevron, no button role and no press
// handler: nothing invites a tap that would do nothing. 5b gives them a
// destination and an interaction in the same slice. See PhasePath's header.
//
// TITLE AND TAB LABEL ARE UNCHANGED, AND THAT IS A DECISION (roadmap section 5,
// amendment 2026-09-09, item 4). "Practices" and "Pick a place to start." are
// carried across from the launcher verbatim, markers and all, and both are
// routed to Jen with the 4b hero-label question. The screen whose name IS the
// tab is the worst place to ship an in-house replacement nobody approved.
//
// NO GUIDE PILL, AND THIS ONE IS NOW AN OPEN QUESTION RATHER THAN A SETTLED NO.
// The launcher had none because a doorway is not a surface to describe; UI
// Standards 18 wants one on hubs, and this screen now has content of its own.
// It is left off here because the pill is not in 5a's fence and because what
// the Guide may say about a user's journey is an open section 7 deliverable,
// not a wiring choice. Flagged for disposition rather than decided quietly.
//
// READS journeyStates DIRECTLY, not through PhaseContext. The resolver's
// PhaseContext carries phaseKey, destination, capacitySeed and revisionToken
// (resolveJourney.ts:77) and deliberately no history: the daily loop has no use
// for closed phases. The map is the one surface that does, so it takes the
// document. No new field was needed for any of the four states.
//
// ABSENT STATE IS A REAL RENDER, NOT AN ERROR. A user with no journeyStates
// document (or a read that failed) gets the four cards and no path, which is a
// working screen rather than a message about a failure they cannot act on. The
// path needs a destination to choose its copy, and inventing one would put
// another user's language on this user's screen.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { PhasePath } from '../../components/journey/PhasePath';
import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { PHASE_STATE_LABELS } from '../../constants/journeyCopy';
import { useAuth } from '../../context/AuthContext';
import { derivePhaseStates } from '../../journey/phaseStates';
import { NAV_TARGETS } from '../../navigation/navTargets';
import { ROUTES } from '../../navigation/routes';
import { getJourneyState } from '../../services/firebase/journeyState.service';
import type { JourneyState } from '../../types/models';
import { logger } from '../../utils/logger';

const MIN_TOUCH_TARGET = 48;
const MAX_FONT_SCALE = 1.3;

// EVERY CARD STRING BELOW IS DRAFT and carries the `COPY: draft` sentinel, as
// it did on the launcher. The strings MOVED with their surface; none was
// rewritten, approved or re-drafted, so the sentinel does not move for them.
//
// PILLAR HUBS ARE UNDER A HOLD in the guidelines doc: section 7 defines Focus /
// Energy / Time / Community hubs, and these four are Focus & Time / Energy /
// Routines / Stress Recovery with Community as a separate tab. Section 7 has no
// slot for Stress Recovery and the app has no Community hub, so none of this
// may be rewritten from it until the section is re-specced.

// All four destinations are AppStack screens, siblings of the tab navigator
// rather than children of it, so these navigate calls bubble up out of the tab
// context and PUSH. Pushing is what gives every card a working back path here.
//
// The Routines entry is written as a MAPPED type keyed off NAV_TARGETS.plan
// rather than as a literal `PillarTime:` key. The alias is flag-dependent
// (navTargets.ts:34), so hardcoding one side of it here would silently stop
// type-checking the other.
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
   * type-check.
   */
  go: (navigation: NavigationProp) => void;
}

// Order, labels, descriptors, icons and destinations are the launcher's,
// unchanged. Slice 5b re-houses these onto the phase detail pages: Focus & Time
// under the fourth phase, the other three under the second.
const PILLARS: PillarCardConfig[] = [
  {
    id: 'focus-time',
    // COPY: draft, not from guidelines doc - pending Jen
    label: 'Focus & Time',
    // COPY: draft, not from guidelines doc - pending Jen
    descriptor: 'Protected time for one thing at a time.',
    icon: 'target',
    go: (navigation) => navigation.navigate(ROUTES.PillarFocus),
  },
  {
    id: 'energy',
    // COPY: draft, not from guidelines doc - pending Jen
    label: 'Energy',
    // COPY: draft, not from guidelines doc - pending Jen
    descriptor: 'Ways to shift how you feel.',
    icon: 'white-balance-sunny',
    go: (navigation) => navigation.navigate(ROUTES.PillarEnergy),
  },
  {
    id: 'routines',
    // COPY: draft, not from guidelines doc - pending Jen
    label: 'Routines',
    // COPY: draft, not from guidelines doc - pending Jen
    descriptor: 'The sequences your days run on.',
    // Echoes the dashboard routine card's own icon (RoutineCard.tsx:45).
    icon: 'clipboard-check-outline',
    // The `tab` param is load-bearing: PlanScreen defaults to its habits
    // sub-tab, so a card labelled Routines that omitted it would land the user
    // on habits.
    go: (navigation) => navigation.navigate(NAV_TARGETS.plan, { tab: 'routines' }),
  },
  {
    id: 'stress-recovery',
    // COPY: draft, not from guidelines doc - pending Jen
    label: 'Stress Recovery',
    // COPY: draft, not from guidelines doc - pending Jen
    // Every practice behind this card also sits under Energy, so the descriptor
    // names the MOMENT (activated, now) rather than the mechanism.
    descriptor: 'Something to reach for when stress spikes.',
    icon: 'lifebuoy',
    go: (navigation) => navigation.navigate(ROUTES.PillarStressRecovery),
  },
];

export function JourneyMapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  // Keyed on the UID, not the user OBJECT: useFocusEffect re-runs whenever the
  // callback identity changes, and depending on the object turns any provider
  // that returns a fresh value per render into a load/setState/re-render loop.
  const uid = user?.uid;

  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);

  // Returns rather than sets, so the effect below owns every setState and can
  // drop the result of a read that finished after the screen lost focus.
  const read = useCallback(async (): Promise<JourneyState | null> => {
    if (!uid) return null;
    try {
      return await getJourneyState(uid);
    } catch (e) {
      // The cards below do not depend on this read. A failure costs the path
      // and nothing else, which is why it logs rather than throwing a screen.
      logger.error('[JourneyMap] journey state read failed:', e);
      return null;
    }
  }, [uid]);

  // ON FOCUS, NOT ON MOUNT. The phase can change while the user is on Today
  // (they accept an advance offer, they finish a capture) and this tab stays
  // mounted behind it. A plain useEffect would show them the phase they were in
  // when the app started.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void read().then((next) => {
        if (!active) return;
        setJourney(next);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [read])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="journey-map">
        <View style={styles.titleRow}>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Practices
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            style={styles.loading}
            color={Colors.evergreenTeal}
            testID="journey-map-loading"
          />
        ) : null}

        {!loading && journey ? (
          <PhasePath
            destination={journey.destination}
            states={derivePhaseStates(journey)}
            copy="full"
            stateLabels={PHASE_STATE_LABELS}
            showStateLabels
            testID="journey-map-path"
          />
        ) : null}

        <View style={styles.destinations} testID="journey-map-destinations">
          {/* COPY: draft, not from guidelines doc - pending Jen */}
          <Text style={styles.intro} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {'Pick a place to start.'}
          </Text>

          <View style={styles.cards}>
            {PILLARS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => p.go(navigation)}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}. ${p.descriptor}`}
                testID={`journey-map-card-${p.id}`}
              >
                <View style={styles.cardIcon}>
                  <Icon name={p.icon as any} size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {p.label}
                  </Text>
                  <Text
                    style={styles.cardDescriptor}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {p.descriptor}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            ))}
          </View>
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
  loading: {
    marginTop: Spacing.lg,
  },
  // The path and the doors are separate blocks of the page, so the doors get a
  // rule above them rather than sitting flush against the last phase row.
  destinations: {
    marginTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.lg,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
  },
  // No hero band on this screen (there is no Practices art), so the cards start
  // on normal page rhythm.
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

export default JourneyMapScreen;
