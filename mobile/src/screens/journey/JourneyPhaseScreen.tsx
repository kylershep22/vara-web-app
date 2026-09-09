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
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { PHASE_DISPLAY } from '../../constants/journey';
import { PHASE_PAGE_BODIES, PHASE_PAGE_COPY, PHASE_STATE_LABELS } from '../../constants/journeyCopy';
import { useAuth } from '../../context/AuthContext';
import { derivePhaseStates } from '../../journey/phaseStates';
import { getJourneyState } from '../../services/firebase/journeyState.service';
import type { JourneyState } from '../../types/models';
import { logger } from '../../utils/logger';
import { labelForReplacement } from './removeCapture/routing';

const MAX_FONT_SCALE = 1.3;

export interface JourneyPhaseParams {
  phase: import('../../types/models').PhaseKey;
  destination: import('../../types/models').DestinationKey;
}

type PhaseRoute = RouteProp<{ JourneyPhase: JourneyPhaseParams }, 'JourneyPhase'>;

export function JourneyPhaseScreen() {
  const { params } = useRoute<PhaseRoute>();
  const { phase, destination } = params;
  const { user } = useAuth();
  // Keyed on the UID, not the user OBJECT, for the reason the map's own read
  // records: useFocusEffect re-runs on callback identity.
  const uid = user?.uid;

  const [journey, setJourney] = useState<JourneyState | null>(null);

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
  const stateLabel = journey
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
});

export default JourneyPhaseScreen;
