// One phase, explained — journey slice 5b-i. Reached from a journey map row.
//
// AN EXPLANATION, NOT A PRACTICE BROWSER (Kyle, 2026-09-09, decision 2). The
// page carries four things and nothing else: the destination-specific title and
// gloss for this phase, a short body saying what the stretch is doing, the
// state the user is in relative to it, and a back path. NO destination cards, NO
// category cards, NO practice lists. A page offering three doors would rebuild
// the toolkit architecture that deleting the 5a launcher removed, one level
// down and out of sight.
//
// THE FOUR DESTINATION CARDS STAY ON THE MAP (decision 3). Row 5b originally
// said these pages would re-house them; that clause is superseded. Every
// destination is reachable exactly as it was yesterday, from the card block
// below the map's divider. Where the practice catalog ultimately lives is an
// OPEN IA QUESTION and this slice does not answer it.
//
// ONE SCREEN, FOUR PAGES. The four differ by which phase they are about, so
// they are one route with a `phase` param rather than four registrations. The
// body is the only per-phase copy; everything else is a lookup.
//
// WHY `destination` IS A ROUTE PARAM AND THE STATE IS NOT. The map holds a
// freshly read journey document when it pushes here, and the destination is a
// stored scalar that no surface in the app can change once onboarding sets it.
// Passing it means the page's TITLE AND BODY still render if this screen's own
// read fails, which matters because those are the page. The user's POSITION is
// re-read here rather than passed: it can change while this screen is open
// (an advance accepted on Today), and a stale state word is a wrong statement
// about the user rather than a missing one.
//
// NO GUIDE PILL (decision 6). The Guide's stance, its data-access position and
// its crisis path are an open section 7 deliverable. A pill on a page that
// displays a user's journey invites questions about that journey which the
// product cannot yet answer on the record. No `context.screen` value is wired
// here "ready for later" either: an unused vocabulary entry is how the decision
// gets made by whoever types the next one.
//
// PLACEHOLDER CONTENT DOES NOT SURFACE HERE. Recover's nine protocol variants
// and refocus's three carry `PLACEHOLDER [Jen]` on name, dailyAction, estMinutes
// and whyItWorks; rewire's three are the only cells flagged `placeholder: true`.
// None of it is read on this page. Remove's nine `whyItWorks` strings ARE
// approved, and they are still not read here: they are per-capacity protocol
// rationale, and the slice 9 behavioral screen is the surface designed for them.

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { PHASE_DISPLAY, PHASE_ORDER } from '../../constants/journey';
import {
  ADVANCE_PREVIEW_COPY,
  PHASE_PAGE_BODIES,
  PHASE_PAGE_COPY,
  PHASE_STATE_LABELS,
} from '../../constants/journeyCopy';
import { useAuth } from '../../context/AuthContext';
import { derivePhaseStates } from '../../journey/phaseStates';
import {
  advancePhase,
  getJourneyState,
  recordAdvanceDeclined,
} from '../../services/firebase/journeyState.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';
import type { JourneyState } from '../../types/models';
import { logger } from '../../utils/logger';
import { labelForReplacement } from './removeCapture/routing';

const MAX_FONT_SCALE = 1.3;
const MIN_TOUCH_TARGET = 48;

export interface JourneyPhaseParams {
  phase: import('../../types/models').PhaseKey;
  destination: import('../../types/models').DestinationKey;
}

type PhaseRoute = RouteProp<{ JourneyPhase: JourneyPhaseParams }, 'JourneyPhase'>;

export function JourneyPhaseScreen() {
  const { params } = useRoute<PhaseRoute>();
  const navigation = useNavigation();
  const { phase, destination } = params;
  const { user } = useAuth();
  // Keyed on the UID, not the user OBJECT, for the reason the map's own read
  // records: useFocusEffect re-runs on callback identity.
  const uid = user?.uid;

  const [journey, setJourney] = useState<JourneyState | null>(null);
  // In flight, and failed. Two booleans rather than a status union because the
  // page has exactly two controls and neither has a third state.
  const [committing, setCommitting] = useState(false);
  const [commitFailed, setCommitFailed] = useState(false);

  const read = useCallback(async (): Promise<JourneyState | null> => {
    if (!uid) return null;
    try {
      return await getJourneyState(uid);
    } catch (e) {
      // The page's own content does not depend on this. A failure costs the
      // state word and the stored intention; the explanation still renders.
      logger.error('[JourneyPhase] journey state read failed:', e);
      return null;
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void read().then((next) => {
        if (!active) return;
        setJourney(next);
      });
      return () => {
        active = false;
      };
    }, [read])
  );

  const cell = PHASE_DISPLAY[phase][destination];

  // ---- Preview mode (slice 7a decisions 4 and the option-2 refinement) ----
  //
  // DERIVED, NOT PASSED, AND THAT IS WHAT MAKES THE DEMOTED OFFER EXIST.
  // Decision 4's wording was "opens the next phase's detail page in preview
  // mode"; its substance was preview-before-commit with no mutation until
  // "Start this", and deriving preserves that entirely. What deriving ALSO buys
  // is section 9 R3's "then map only": once the offer demotes off Today it has
  // to live somewhere, and 7a's fence contains no map surface. It does not need
  // one. Every journey map row already opens onto this page, including the ones
  // ahead (JourneyMapScreen.tsx onPressPhase; roadmap section 8, "AHEAD opens"),
  // so map -> next-phase row -> this page IS the demoted surface, with no change
  // to the map at all. A route param would have given Today's path a control the
  // map's path lacked, and R3's demotion would have demoted to silence.
  //
  // `advanceOfferedAt` IS THE CONDITION, AND IT IS EXACT RATHER THAN CONVENIENT.
  // It is non-null if and only if the offer has occupied Today at least once,
  // which is the definition of "this user has been offered advancement". The
  // alternative was recomputing eligibility here, which needs `consistentDays`
  // and therefore a dailyLogs read this screen has never done. The stored
  // timestamp answers the same question off a document already in hand.
  //
  // A USER WHO HAS NEVER BEEN OFFERED SEES NOTHING. Browsing ahead on the map is
  // browsing, not an invitation, and section 8 is explicit that AHEAD opens
  // without implying permission was granted or withheld.
  const currentIdx = journey ? PHASE_ORDER.indexOf(journey.phaseKey) : -1;
  const nextPhase =
    currentIdx >= 0 && currentIdx < PHASE_ORDER.length - 1
      ? PHASE_ORDER[currentIdx + 1]
      : null;
  const isPreview = !!journey && phase === nextPhase && !!journey.advanceOfferedAt;

  // THE STATE EYEBROW IS SUPPRESSED IN PREVIEW (Kyle, slice 7a). The state word
  // answers "where am I"; the preview answers "shall I go here". Rendering
  // "Ahead" above an invitation to start this phase makes the page argue with
  // itself: it labels the thing as not-yours in the same breath as offering it.
  // Suppressed rather than replaced, because the honest answer to "where am I"
  // on this page in this moment is that the user is deciding, and a word for
  // that would be a word about the UI rather than about them.
  const stateLabel =
    journey && !isPreview
      ? PHASE_STATE_LABELS[derivePhaseStates(journey)[phase]]
      : null;

  // THE REMOVE PAGE'S ONE PIECE OF REAL USER STATE (slice 3c-ii). Gated on
  // `removeReplacementAt` and nothing else, per the model's own contract: the id
  // and the slot can each be legitimately absent, and the timestamp is what says
  // a pick happened. The resolver returns null for an id the menus no longer
  // carry, so a retired option renders as nothing rather than as an empty row.
  //
  // CURATED LABEL ONLY. `removeTargetText` is the user's own words and is not
  // echoed on any phase page (decision 5): its single echo point stays at the
  // capture confirmation, where the user is looking at what they just typed.
  const replacement =
    phase === 'remove' && journey?.removeReplacementAt
      ? labelForReplacement(journey.removeReplacementSlot, journey.removeReplacementId)
      : null;

  // THE ONLY CONTROL IN THE WHOLE ADVANCEMENT FLOW THAT MUTATES A PHASE.
  // Everything upstream of this - the card's primary, the navigation, this
  // page's render - moves nothing (decision 4).
  //
  // `advancePhase` READS FRESH STATE AND COMPUTES ITS OWN TARGET, so it cannot
  // disagree with the phase this page previewed even if the document changed
  // while the page was open. It is also already a no-op at the last phase and
  // when no state exists, so neither needs guarding here.
  //
  // NAVIGATION ONLY ON SUCCESS. Going back on a failed write would return the
  // user to a Today that still showed the offer, which reads as the tap having
  // done nothing when in fact it had failed. Staying put with a line to read is
  // the honest version, and the button remains tappable.
  const onStartThis = useCallback(async () => {
    if (!uid || committing) return;
    setCommitting(true);
    setCommitFailed(false);
    try {
      await advancePhase(uid);
      logEvent(uid, 'journey_advance_accepted', {});
      navigation.goBack();
    } catch (e) {
      logger.error('[JourneyPhase] advance failed:', e);
      setCommitFailed(true);
    } finally {
      setCommitting(false);
    }
  }, [uid, committing, navigation]);

  // "Not yet" DECLINES, and decision 4 is what permits it: "Start this" is
  // named there as the only thing that mutates PHASE, and a decline mutates the
  // offer bookkeeping instead. A "Not yet" that left the offer live would show
  // the card again tomorrow to someone who had opened it and said no, which is
  // the follow-up nag section 8 rules out of a decline.
  //
  // NAVIGATION IS NOT GATED ON THE WRITE HERE, unlike the commit above. The
  // user asked to leave; a failed decline costs them one more sighting of a
  // card they can dismiss again, which is a smaller harm than trapping them on
  // a page because a write failed.
  const onNotYet = useCallback(() => {
    if (uid) {
      logEvent(uid, 'journey_advance_declined', { from: 'preview' });
      void recordAdvanceDeclined(uid).catch((e) => {
        logger.error('[JourneyPhase] decline failed:', e);
      });
    }
    navigation.goBack();
  }, [uid, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID={`journey-phase-${phase}`}>
        {stateLabel ? (
          <Text
            style={styles.state}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            testID="journey-phase-state"
          >
            {stateLabel}
          </Text>
        ) : null}

        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {cell.title}
        </Text>
        <Text style={styles.gloss} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {cell.gloss}
        </Text>

        <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {PHASE_PAGE_BODIES[phase]}
        </Text>

        {replacement ? (
          <View style={styles.intention} testID="journey-phase-replacement">
            <Text style={styles.intentionLead} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {PHASE_PAGE_COPY.replacementLeadIn}
            </Text>
            <Text style={styles.intentionValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {replacement}
            </Text>
          </View>
        ) : null}

        {/* ---- The commit, in preview only ----

            AT THE BOTTOM, AFTER THE EXPLANATION, and the position is the whole
            argument of decision 4. The user reads what this stretch is before
            they are asked to start it. Controls above the body would make the
            page an offer with an explanation attached rather than an
            explanation with an offer at the end of it. */}
        {isPreview ? (
          <View style={styles.commit} testID="journey-phase-commit">
            <TouchableOpacity
              style={[styles.cta, committing && styles.ctaBusy]}
              onPress={onStartThis}
              activeOpacity={0.8}
              disabled={committing}
              accessibilityRole="button"
              accessibilityState={{ disabled: committing, busy: committing }}
              accessibilityLabel={ADVANCE_PREVIEW_COPY.startThis}
              testID="journey-phase-start"
            >
              <Text style={styles.ctaLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {ADVANCE_PREVIEW_COPY.startThis}
              </Text>
            </TouchableOpacity>

            {/* Quiet, unbordered, and given the same reach as the primary.
                Staying put is a real answer and never a failure state. */}
            <TouchableOpacity
              style={styles.secondary}
              onPress={onNotYet}
              accessibilityRole="button"
              accessibilityLabel={ADVANCE_PREVIEW_COPY.notYet}
              testID="journey-phase-not-yet"
            >
              <Text style={styles.secondaryLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {ADVANCE_PREVIEW_COPY.notYet}
              </Text>
            </TouchableOpacity>

            {commitFailed ? (
              <Text
                style={styles.error}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                testID="journey-phase-commit-error"
              >
                {ADVANCE_PREVIEW_COPY.failed}
              </Text>
            ) : null}
          </View>
        ) : null}
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
  // The state word sits ABOVE the title as an eyebrow rather than beside it.
  // Beside it, the longest of the four ("Where you are") competes with a title
  // that can run to two lines; above it, it reads as context and gets out of
  // the way. Same word, same map vocabulary, quieter position.
  state: {
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
  },
  gloss: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginTop: Spacing.sm,
  },
  body: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
    marginTop: Spacing.lg,
  },
  intention: {
    marginTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.lg,
  },
  intentionLead: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
  intentionValue: {
    fontSize: Typography.fontSize.lg,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.normal,
    color: Colors.softCharcoal,
    marginTop: Spacing.xs,
  },
  commit: {
    marginTop: Spacing.xl,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  // Opacity, not a colour swap. A disabled teal in a different token would be a
  // second brand colour nobody chose; dimming the same one reads as "working"
  // rather than as "broken".
  ctaBusy: {
    opacity: 0.6,
  },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  secondary: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  secondaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  // Soft Coral, and this is the case it is reserved for: a write that genuinely
  // failed (UI Standards 4.4, roadmap section 8). Nothing else on this page may
  // acquire it.
  error: {
    ...TextStyles.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default JourneyPhaseScreen;
