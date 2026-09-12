// The Practices tab root — journey slice 5a. Replaces PracticesHubScreen.
//
// THE MAP, AND THE DOORS, ON ONE SCREEN. Roadmap section 1: "Practices tab is
// the journey map: vertical stack, destination titles, visible state labels,
// one-line gloss." That is the top of this screen. Underneath it are the four
// pillar cards the launcher used to be, unchanged and still working, because
// 5a has nowhere else to put them yet.
//
// WHY BOTH, AND IT IS NO LONGER TEMPORARY (Kyle, 2026-09-09, slice 5b-i,
// decision 3). Row 5b originally said the phase detail pages would re-house
// these four destinations. THAT CLAUSE IS SUPERSEDED: a phase page is an
// EXPLANATION, and a page offering three doors would rebuild the toolkit
// architecture that deleting the launcher removed. So the cards stay here, below
// the divider, and every destination is reachable exactly as it was.
//
// This screen is still the ONLY navigator to ROUTES.PillarFocus and
// ROUTES.PillarStressRecovery in the app, which is why the card block is load
// bearing rather than decorative: FocusHubScreen went dark for two months after
// IA step 2 with its own unit suite green the whole time (AppNavigator.tsx:533,
// and the step-4a restore path suite). WHERE THE PRACTICE CATALOG ULTIMATELY
// LIVES IS AN OPEN IA QUESTION, logged as open rather than settled here.
//
// THE MAP ROWS NAVIGATE, as of 5b-i: each opens that phase's explanation
// (ROUTES.JourneyPhase). Every row opens, including the ones ahead, because
// AHEAD OPENS (roadmap section 8) and a path where only some rows led somewhere
// would draw a locked door the model does not have. 5a shipped them inert with a
// test pinning that shut; the page and the affordance arrive together, which is
// what that test was holding out for.
//
// TITLE AND TAB LABEL ARE UNCHANGED, AND THAT IS A DECISION (roadmap section 5,
// amendment 2026-09-09, item 4). "Practices" and "Pick a place to start." are
// carried across from the launcher verbatim, markers and all, and both are
// routed to Jen with the 4b hero-label question. The screen whose name IS the
// tab is the worst place to ship an in-house replacement nobody approved.
//
// NO GUIDE PILL, ANSWERED IN 5b-i (decision 6). Not an open question any more
// and not a deferral: the Guide's stance, its data-access position and its
// crisis path are an open section 7 deliverable, and a pill on a surface that
// displays a user's journey creates expectations the product cannot yet honour.
// The phase pages carry none either, and no `context.screen` value is wired
// anywhere "ready for later".
//
// START HERE SITS ABOVE THE PATH, AND IT IS THE FIRST PRODUCTION CONTAINER OVER
// VideoPlayerModal (slice 5c). It renders NOTHING until its video resolves, and
// neither video exists yet, so this mount is invisible on merge and that is the
// intended state: the mechanism ships now, the videos are Jen's data and arrive
// later (roadmap section 6 item 9). The row is deliberately outside the journey
// read — it is a sibling of the loading branch, never a child of it, so the
// explainer does not disappear for the users whose journey document is slow,
// absent or unreadable.
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
import { StartHereRow } from '../../components/journey/StartHereRow';
import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { PHASE_STATE_LABELS } from '../../constants/journeyCopy';
import { useAuth } from '../../context/AuthContext';
import { derivePhaseStates } from '../../journey/phaseStates';
import { NAV_TARGETS } from '../../navigation/navTargets';
import { ROUTES } from '../../navigation/routes';
import { getRenderableJourneyState } from '../../services/firebase/journeyState.service';
import type { JourneyState } from '../../types/models';
import type { JourneyPhaseParams } from './JourneyPhaseScreen';
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
    JourneyPhase: JourneyPhaseParams;
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
// unchanged, and they STAY HERE (slice 5b-i decision 3, above). The 5a entry
// predicted these nine drafted strings might die with the block in 5b; that
// prediction is deferred, not executed, and the sentinel does not move for them
// in this slice either.
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
      // THE VALIDATING ACCESSOR, NOT THE RAW READ (slice 7f). A document whose
      // `destination` is outside its union reaches `PhasePath` below, indexes
      // PHASE_DISPLAY during a render and throws. When 7f wrote this, the
      // app's single ErrorBoundary (App.tsx:114) answered that by replacing the
      // WHOLE APP; since slice 7g this tab has its own boundary, so it would
      // cost Practices alone. Still a fallback where a page should be.
      // The accessor answers null instead, which is the state the path is
      // already written for: the branch below renders nothing, and Start here
      // and the destination cards are siblings that never depended on it.
      return await getRenderableJourneyState(uid);
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

        {/* ABOVE THE PATH AND BELOW THE TITLE, AND IT NEVER MOVES. Placing it
            under the path would make it slide down the moment the journey read
            lands, which is a layout shift on the calmest surface in the app for
            no gain. Here it holds one position across all three of this screen's
            states: loading, journey-absent and drawn. It also puts orientation
            second on the page, which is where section 8 puts it on Today. */}
        {/* SECTION 1 DOES NOT PIN THIS. Its sentence lists what the tab contains
            ("vertical stack, destination titles, visible state labels, one-line
            gloss, Start here collapsing after first play"); the first four are
            attributes of the SAME stack, so the list is an enumeration of
            features and not a top-to-bottom layout. */}
        {/* OUTSIDE THE JOURNEY READ ENTIRELY. It is a sibling of the loading
            branch and of the path, not a child of either, so a slow or failed
            journeyStates read cannot take the explainer down with it. Slice 5c's
            fence: the row touches neither PHASE_DISPLAY nor journeyStates. */}
        <StartHereRow
          surface="practices"
          userId={uid}
          // COPY: draft, not from guidelines doc - pending Kyle
          gloss={'A short video on how this works.'}
          testID="journey-map-start-here"
        />

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
            // EVERY ROW OPENS, INCLUDING THE ONES AHEAD (roadmap section 8:
            // AHEAD opens). The destination travels with the phase so the page
            // can render its title and body even if its own read fails; the
            // page re-reads the document for the user's position, which can
            // change while it is open.
            onPressPhase={(phase) =>
              navigation.navigate(ROUTES.JourneyPhase, {
                phase,
                destination: journey.destination,
              })
            }
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
