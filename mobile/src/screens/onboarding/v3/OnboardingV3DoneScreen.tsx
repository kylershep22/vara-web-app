/**
 * Step 10 of 10 — Terminal. The only screen in the arc that writes what the arc
 * collected.
 *
 * It does four things in a fixed order: the private-doc patch, the first weekly
 * cycle, the journey state, then completion.
 *
 * ORDER IS LOAD-BEARING: everything else lands BEFORE completeOnboarding.
 * Flipping hasCompletedOnboarding re-renders AppNavigator away from the
 * onboarding stack, so any write still in flight at that moment is racing an
 * unmount. This is the same sequencing OnboardingAnchorScreen uses for the same
 * reason.
 *
 * The private-doc patch is ONE setUserPrivate call, not three. It merges, so a
 * single write carries every answer and a partial failure cannot leave the
 * document half-populated.
 *
 * THE JOURNEY STATE IS WRITTEN THIRD, after the cycle and before completion
 * (journey slice 4). Position matters in one direction only: it must precede
 * completeOnboarding, because a user who reaches Home with no journeyStates
 * document takes the resolver's migration branch and gets a destination
 * DERIVED from their cycle rather than the one they just chose. Those agree
 * today, so the bug would be invisible; they stop agreeing the moment slice 4b
 * takes the outcome off the cycle. Ordering it before the flag flip is what
 * makes that a non-event.
 *
 * `activeOutcome` IS NO LONGER WRITTEN. The destination lives on journeyStates
 * now. The FIELD is not retired and must not be: resolveJourney still reads it
 * as the migration branch's second fallback, and every account that predates
 * this slice has a real value there. What ended is onboarding being one of its
 * writers.
 *
 * SKIPPED FIELDS ARE OMITTED, NOT NULLED. UserPrivate types these as optional,
 * and getFloorCommitment already reads absent and empty the same way. Writing
 * null would mean storing "they answered nothing", which is a different fact
 * from "they never answered" and is not one any reader wants.
 *
 * No back affordance: everything behind it has been answered, and these writes
 * are not meant to be re-run.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { Colors, Spacing, Typography } from '../../../constants';
import { useAuth } from '../../../context/AuthContext';
import { completeOnboarding } from '../../../services/firebase/onboarding.service';
import { createJourneyState } from '../../../services/firebase/journeyState.service';
import { outcomeForDestination } from '../../../journey/destinationBridge';
import {
  getUserPrivate,
  setUserPrivate,
  type UserPrivatePatch,
} from '../../../services/firebase/userPrivate.service';
import {
  createWeeklyCycle,
  getWeeklyCycleForWeek,
} from '../../../services/firebase/weeklyCycle.service';
import { legacyPhaseFor, representativeProtocol } from '../../../protocolEngine';
import { planWeek, toIsoDate } from '../../../utils/weekStart';
import { logger } from '../../../utils/logger';
import { DONE_COPY } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3DoneScreen: React.FC = () => {
  const { user } = useAuth();
  const { destination, whyNote, capacity, floorCommitment, weekStartDay } =
    useOnboardingV3();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = useCallback(async () => {
    if (busy || !user?.uid) return;
    setBusy(true);
    setFailed(false);

    try {
      // Built conditionally so a skipped answer is absent rather than null.
      const patch: UserPrivatePatch = {};
      // The capacity SEED, not today's capacity. Re-homed here by journey
      // slice 4 so resolveJourney stops reading it off the weekly cycle.
      if (capacity) patch.capacitySeed = capacity;
      if (whyNote) patch.whyNote = whyNote;
      if (floorCommitment) patch.floorCommitment = floorCommitment;
      // `!== null` rather than a truthiness check: Sunday is 0, and a falsy
      // guard here would silently drop the answer of every user who picks it.
      if (weekStartDay !== null) patch.weekStartDay = weekStartDay;

      // A user who skipped both free-text steps still has an outcome, so the
      // patch is never empty in practice. Guarded anyway: an empty merge would
      // be a write that only stamps timestamps.
      if (Object.keys(patch).length > 0) {
        await setUserPrivate(user.uid, patch);
      }

      // Open the first weekly cycle. Both answers are required steps, so they
      // are present here; the guard covers the impossible case rather than
      // trapping the user in onboarding over it.
      //
      // STILL CARRIES AN OUTCOME, deliberately and only for now. Roadmap
      // section 5's slice 4 row says the first cycle should be created without
      // one; that half was split out as slice 4b because
      // `WeeklyCycle.outcome` is a required field with two live readers
      // (TodayHeroCard, CloseWeekEntry) and because the 3b rollover defaults a
      // missing outcome to 'focus', which would fabricate one a week later for
      // a user who chose something else. Nothing downstream of this write moves
      // in 4a.
      if (destination && capacity) {
        // THE SETUP WEEK, always. `priorWeekEnd: null` is passed literally
        // rather than read from the user's cycles, and that is load-bearing for
        // the dedup below: on a retry the first cycle DOES exist, so deriving
        // this would flip the plan from "stub starting today" to "the next
        // anchored week", the dedup key would no longer match what was written,
        // and the retry would create the duplicate this whole block exists to
        // prevent. Onboarding opens a setup week or it opens nothing.
        //
        // Read after setUserPrivate above, so a start day captured during this
        // same run is already stored and is the one planned against. Absent
        // until the setup picker ships, and planWeek then anchors on today,
        // which is the behavior this screen had before.
        const priv = await getUserPrivate(user.uid);
        const { weekStart, weekEnd } = planWeek({
          todayIso: toIsoDate(new Date()),
          weekStartDay: priv?.weekStartDay,
          priorWeekEnd: null,
        });

        // A week is opened once, and the whole weekly model assumes it. Without
        // this read a retry after a failed completeOnboarding would write a
        // SECOND cycle for the same week, and so would a user who force-quit
        // between the cycle write and the flag flip and started the arc over.
        //
        // The key is the PLANNED weekStart, not today's date. The two are the
        // same only while a setup week starts today; keeping the lookup tied to
        // the plan is what stops them drifting apart in a later slice.
        const existing = await getWeeklyCycleForWeek(user.uid, weekStart);
        if (!existing) {
          await createWeeklyCycle(user.uid, {
            weekStart,
            weekEnd,
            outcome: outcomeForDestination(destination),
            capacityInitial: capacity,
          });
        }
      }

      // The journey itself. Every journey opens on Remove (roadmap section 1),
      // so the phase is not a choice and is not asked for.
      //
      // AFTER the cycle and BEFORE completion; see this file's header. Written
      // unconditionally on the destination alone, because a user without one
      // cannot have reached this screen and a journey is what Home resolves
      // against from here on.
      if (destination) {
        await createJourneyState(user.uid, { destination, phaseKey: 'remove' });
      }

      // LAST. This flips hasCompletedOnboarding, and the navigator re-renders
      // off the onboarding stack the moment it lands. That re-render IS the
      // landing: there is no navigate() here because Home lives in a navigator
      // that is not mounted yet, so the flip is the only thing that can route
      // onward. Same mechanism the V2 terminal relies on. Making Home reflect
      // the cycle this writes is the next slice.
      await completeOnboarding(user.uid);
    } catch (error) {
      logger.error('[OnboardingV3Done] completion failed:', error);
      // Stay put with a retry rather than dropping the user into the app with
      // nothing saved. Everything is still in context, so a retry re-sends the
      // same patch.
      setFailed(true);
      setBusy(false);
    }
  }, [busy, user?.uid, destination, whyNote, capacity, floorCommitment, weekStartDay]);

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Done)}
      totalSteps={V3_TOTAL_STEPS}
      title={DONE_COPY.title}
      subtitle={DONE_COPY.subtitle}
      primaryLabel={DONE_COPY.primary}
      primaryDisabled={busy}
      onPrimary={finish}
      decorativeIcon={CheckCircle2}
      centerContent
    >
      {failed && (
        <Text style={styles.error} testID="v3-done-error">
          {DONE_COPY.saveFailed}
        </Text>
      )}
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  error: {
    marginTop: Spacing.base,
    textAlign: 'center',
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});

export default OnboardingV3DoneScreen;
