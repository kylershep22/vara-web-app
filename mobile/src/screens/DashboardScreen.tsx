/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../components';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import { ActiveRoutinePlayer } from './Time/ActiveRoutinePlayer';
import { NAV_TARGETS } from '../navigation/navTargets';
import { InsightCard } from '../components/dashboard/InsightCard';
import { RoutineCard } from '../components/dashboard/RoutineCard';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { HabitNoteSheet } from '../components/habits/HabitNoteSheet';
import { InsightsLookbackCard } from '../components/dashboard/InsightsLookbackCard';
import { FirstShiftFooter } from '../components/dashboard/FirstShiftFooter';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { ScreenHeader, BAND_STRONG_SCRIM } from '../components/shared/ScreenHeader';
import { GuidePill } from '../components/ai/GuidePill';
import { DASHBOARD_SUPPRESS, JOURNEY_IA } from '../constants/dashboardConfig';
import { PHASE_ORDER } from '../constants/journey';

// The one illustration on Home: a watercolor header band. Raster asset (WebP)
// rendered via ScreenHeader's expo-image layer, never an SVG icon.
const homeHeader = require('../../assets/images/homeHeader.webp');

// How far the first content block rides up onto the header's bottom (mist) seam
// — matches Focus/Energy so the overlap reads identically across heroes.
const CARD_OVERLAP = Spacing.xl;
import { TodayHeroCard } from '../components/dashboard/TodayHeroCard';
import { SetTodayCard } from '../components/dashboard/SetTodayCard';
import { DailyPickerSheet } from '../components/dashboard/DailyPickerSheet';
import { CloseWeekEntry } from '../components/dashboard/CloseWeekEntry';
import { MigrationRouteScreen } from './journey/MigrationRouteScreen';
import { RemoveCaptureCard } from '../components/dashboard/RemoveCaptureCard';
import { AdvancementCard } from '../components/dashboard/AdvancementCard';
import { JourneyLine } from '../components/dashboard/JourneyLine';
import { StartHereRow } from '../components/journey/StartHereRow';
import { JOURNEY_LINE_LABEL, TODAY_START_HERE_GLOSS } from '../constants/journeyCopy';
import { journeyActionFor } from '../journey/journeyAction';
import { useAdvanceOffer } from '../hooks/useAdvanceOffer';
import { logEvent } from '../services/firebase/analyticsEvents.service';
import { useDashboard } from '../hooks/useDashboard';
import { useJourneyLanding } from '../hooks/useJourneyLanding';
import { cycleSource, phaseSource, useTodayCard } from '../hooks/useTodayCard';
import { useWeeklyCloseEntry } from '../hooks/useWeeklyCloseEntry';
import { ROUTES } from '../navigation/routes';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { subscribeMergedUserData } from '../services/firebase/userMigrationRead';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    navigation,
    dataLoading,
    dataErrors,
    refreshing,
    greeting,
    formattedDate,
    handleRefresh,
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,
    showEventCodeCard,
    eventCodeSheetVisible,
    setEventCodeSheetVisible,
    handleEventCodeDismiss,
    handleEventCodeSuccess,
    dashboardRoutines,
    routineCompletions,
    activePlayerRoutine,
    routinePlayerVisible,
    handleBeginRoutine,
    handleCloseRoutinePlayer,
    handleRoutineComplete,
    habits,
    allCompletions,
    weeklyCompletions,
    processingHabits,
    handleHabitToggle,
    noteTarget,
    saveNote,
    dismissNote,
  } = useDashboard();

  // Sub-step 2.7 — subscribe to the user's firstShiftAt for the
  // FirstShiftFooter render decision. Real-time so a shift completed
  // in CheckInFlow surfaces the footer immediately on dashboard
  // remount or focus, regardless of whether DashboardScreen unmounts
  // during navigation. Single field, narrow scope; Phase 3 may
  // refactor into a shared useUserProfile hook when intentPath also
  // needs subscribing.
  const [firstShiftAt, setFirstShiftAt] = useState<Timestamp | null>(null);
  useEffect(() => {
    if (!user?.uid || !db) return;
    // MIGRATION_FALLBACK — firstShiftAt moved to userPrivate in slice 2.
    const unsubscribe = subscribeMergedUserData(user.uid, (data) => {
      const value = (data?.firstShiftAt as Timestamp | undefined) ?? null;
      setFirstShiftAt(value);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // ---- Weekly landing (landing slice, sub-step 1) ----
  //
  // Home answers the entry guard's question itself, because it is a TAB and
  // cannot be `replace`d into the way WeeklyEntryScreen replaces between routes.
  // The RULE is untouched and shared: useWeeklyLanding calls resolveWeeklyEntry.
  //
  // 'today' is served by rendering (the Today hero lands in sub-step 2). The
  // other two targets are pushed OVER the tab, so the tab bar stays and the user
  // keeps their place.
  // useJourneyLanding WRAPS useWeeklyLanding rather than replacing it, so this
  // is one call site in both flag states. With JOURNEY_IA off it returns the
  // weekly landing's own fields verbatim and `phase` is always null, which is
  // what makes the flag-off path the original code rather than a second
  // implementation of it.
  const weeklyLanding = useJourneyLanding(user?.uid);

  // The day's action, sourced from the cycle the landing hook resolved. No-ops
  // to an empty card when there is no cycle, so it is safe to call
  // unconditionally.
  //
  // No reload is handed in any more. `weeklyLanding.refresh` used to be the
  // retired re-set's way of re-reading a cycle this screen does not own; with
  // the re-set gone nothing in the card mutates the cycle, so the hook no longer
  // takes the callback at all.
  //
  // THE DAY'S SOURCE. Under JOURNEY_IA the day comes from the resolved phase
  // and not from the week; with the flag off it is the cycle exactly as before.
  // `phaseSource` falls back to the cycle when the resolver landed on 'legacy',
  // which is the rung that keeps a user with no derivable destination on the
  // surface they already had.
  const todaySource =
    JOURNEY_IA && weeklyLanding.phase
      ? phaseSource(weeklyLanding.phase)
      : cycleSource(weeklyLanding.cycle);
  const todayCard = useTodayCard(user?.uid, todaySource);

  // The daily picker's visibility, and nothing else. Opening the sheet writes
  // NOTHING: `hasPickedToday` keys on the stored time field, so a write on open
  // would mark the day answered because the user looked at it. The only write
  // is behind the sheet's confirm, in useTodayCard.confirmPick.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Session-scoped only. The durable re-offer schedule (retire 7 days, show
  // once more, then a quiet row) is slice 5; see RemoveCaptureCard.
  const [captureDismissed, setCaptureDismissed] = useState(false);

  /**
   * Dismissal of the post-migration route explanation, FOR THIS SESSION ONLY.
   *
   * Nothing persists, and nothing needs to: the resolver reports a migration
   * only on the resolve that creates the journey, so the next launch does not
   * offer the screen again whatever this holds. This state exists purely so the
   * primary can dismiss it without waiting for a re-resolve.
   */
  const [routeExplainerDismissed, setRouteExplainerDismissed] = useState(false);

  // ---- The ONE journey-action slot (slice 7a decision 3) ----
  //
  // `showRemoveCapture` STOOD HERE AS ITS OWN BOOLEAN and is gone, folded into
  // journeyActionFor with the other two offers. The capture card was never in
  // competition with anything before: 3c-i shipped it beside a continuity count
  // that has since retired, and until this slice there was no second offer for
  // it to contend with. There is now. If it looks like a card it occupies
  // attention like a card, so it takes its turn in one slot rather than
  // rendering alongside whatever else is due.
  //
  // ITS CONDITION IS UNCHANGED, only relocated: phase is 'remove', there is no
  // removeCapturedAt, and it has not been dismissed this session. The one term
  // that did NOT move is `JOURNEY_IA`, and it was redundant rather than
  // dropped - useJourneyLanding sets `phase` to null whenever the flag is off
  // (useJourneyLanding.ts:108-115), so `phaseKey === null` already covers every
  // state this term covered. journeyActionFor documents that at its input.
  const advanceOffer = useAdvanceOffer({
    uid: user?.uid,
    phase: weeklyLanding.phase,
    consistentDays: todayCard.consistentDays,
    todayIso: todayCard.todayIso,
  });

  const journeyAction = journeyActionFor({
    phaseKey: weeklyLanding.phase?.phaseKey ?? null,
    hasRemoveCapture: weeklyLanding.phase?.hasRemoveCapture ?? false,
    captureDismissed,
    // Slice 7b supplies the adjust placement and its card. The BRANCH exists in
    // journeyActionFor and is pinned by a priority test; this literal is what
    // makes it unreachable at runtime until then. It is a constant rather than
    // an omission so that 7b changes one expression, not a signature.
    adjustPlacement: 'hidden',
    advancePlacement: advanceOffer.placement,
  });

  // Opening the next phase's page. IT MUTATES NOTHING (decision 4): the offer
  // stays live, its exposure is already spent for today, and the only control
  // that changes a phase is "Start this" on the page this opens. The page works
  // out for itself that it is being previewed; nothing is passed to say so.
  const openAdvancePreview = useCallback(() => {
    const phase = weeklyLanding.phase;
    if (!phase) return;
    const idx = PHASE_ORDER.indexOf(phase.phaseKey);
    if (idx === -1 || idx >= PHASE_ORDER.length - 1) return;
    (navigation as unknown as {
      navigate: (s: string, p?: object) => void;
    }).navigate(ROUTES.JourneyPhase, {
      phase: PHASE_ORDER[idx + 1],
      destination: phase.destination,
    });
    // navigation is stable for the life of the screen; the phase is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyLanding.phase]);

  // The weekly reset (spec 8). `navigate`, not `replace`: Home is a tab, so the
  // reset is pushed OVER it exactly as the floor flow is below.
  //
  // IT CARRIES THE PHASE (slice 6). The reset asks a destination-flavoured
  // question and stores which phase the answer was about, and Home has both
  // already: it resolved the journey once for this session and hands the same
  // answer down here that it hands to the hero and the entry card. The
  // alternative was a second getJourneyState read on the reset screen, which
  // would answer even with JOURNEY_IA off - the documents outlive the flag -
  // and could disagree with Home when a resolve fell back to legacy.
  //
  // UNDEFINED IS A REAL AND EXPECTED VALUE, not a bug to default away: the flag
  // off, a failed resolve and rung (d) all reach here with no phase, and the
  // reset renders its note without a question rather than inventing one.
  //
  // `phase` IS NOW A DEPENDENCY. The previous comment here said navigation was
  // stable for the life of the screen and that was the whole dep story; it no
  // longer is, and an empty array would pin the first resolved phase forever.
  const phaseKey = weeklyLanding.phase?.phaseKey;
  const phaseDestination = weeklyLanding.phase?.destination;
  const goToClose = useCallback(() => {
    (navigation as unknown as {
      navigate: (s: string, p?: object) => void;
    }).navigate(ROUTES.WeeklyClose, {
      phase: phaseKey,
      destination: phaseDestination,
    });
    // navigation is stable for the life of the screen; the two params are not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey, phaseDestination]);
  const openClose = useWeeklyCloseEntry(user?.uid, goToClose);

  // Re-resolve whenever Home regains focus, so returning from the floor or open
  // flow reflects the week the user just started rather than the stale answer
  // from mount.
  useFocusEffect(
    useCallback(() => {
      weeklyLanding.refresh();
      // refresh is stable (useCallback over a setState updater); depending on
      // the whole landing object here would re-run this on every resolve and
      // loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // ONE PUSH PER DISTINCT TARGET, deliberately. Pushing on every focus would
  // trap a user who backs out of the weekly open: they would land on Home, be
  // pushed straight back, and have no way to reach the rest of the app. Backing
  // out now leaves them on Home for the rest of the session, and the next launch
  // (a fresh mount) offers it again.
  //
  // A standing affordance for a user who declined is a sub-step 2 concern: it
  // only bites once Home IS Today and therefore has nothing to show without a
  // cycle. Noting it here rather than half-solving it now.
  const pushedForRef = useRef<'floor' | null>(null);
  useEffect(() => {
    const target = weeklyLanding.target;
    // 'rollover' is resolved through by the landing and never surfaces, so
    // 'floor' is the only value that reaches the push below. The explicit test
    // keeps that a stated fact rather than an assumption about the hook.
    if (target !== 'floor') {
      // Resolved into the app: clear the latch so a later week boundary can
      // push again without a remount.
      pushedForRef.current = null;
      return;
    }
    // 'floor' is the only push left. An expired week is rolled over in place by
    // the landing and arrives here as 'today', so there is nothing to push for.
    if (pushedForRef.current === target) return;
    pushedForRef.current = target;
    // Navigates directly rather than through the `go` helper below: that helper
    // is declared later in this component, and an effect that depends on
    // declaration order is a trap for the next edit.
    (navigation as unknown as { navigate: (s: string) => void }).navigate(
      ROUTES.WeeklyFloor
    );
    // The latch above is what makes this effect idempotent, not the dependency
    // list; `navigation` is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyLanding.target]);

  // System prompts that survive the rework, rendered after the spec content
  // cards. NotificationOptIn / EventCode are left as-is pending the live-entry
  // confirm.
  const renderSystemPrompt = (cardId: 'notifOptIn' | 'eventCode') => {
    switch (cardId) {
      case 'notifOptIn':
        if (DASHBOARD_SUPPRESS.notifOptIn) return null;
        return notifOptInCard ? (
          <View key="notifOptIn" style={{ paddingHorizontal: Spacing.base }}>
            <NotificationOptInCard
              category={notifOptInCard}
              onOptIn={() => handleNotifOptIn(notifOptInCard)}
              onDismiss={() => handleNotifDismiss(notifOptInCard)}
            />
          </View>
        ) : null;
      case 'eventCode':
        if (DASHBOARD_SUPPRESS.eventCode) return null;
        return showEventCodeCard ? (
          <View key="eventCode" style={{ paddingHorizontal: Spacing.base }}>
            <EventCodeCard
              onEnterCode={() => setEventCodeSheetVisible(true)}
              onDismiss={handleEventCodeDismiss}
            />
          </View>
        ) : null;
    }
  };

  // Locally-typed navigate for the rework's new destinations. The hook's
  // navigation is untyped, so the legacy blocks fall back to `as never` casts
  // that don't type-check; this keeps the new calls clean.
  const go = (screen: string, params?: Record<string, unknown>) =>
    (navigation as unknown as {
      navigate: (s: string, p?: object) => void;
    }).navigate(screen, params);

  if (dataLoading) {
    return <LoadingSpinner message="Loading your wellness dashboard..." />;
  }

  /**
   * A2 for a user the resolver just migrated onto the journey (journey slice
   * 4, roadmap section 4).
   *
   * IN PLACE OF HOME, not over it. The screen explains why the app is about to
   * start them somewhere they did not ask for, and it has one action; rendering
   * it as an overlay on a Home they can still partly see would make it
   * dismissable furniture instead of the explanation it is.
   *
   * ADDITIVE AND REVERSIBLE. Nothing below this point changed: no daily-loop
   * read, no card, no gate. Deleting these four lines returns Home to exactly
   * what it did before, which is the property that let this ship inside a slice
   * whose fence stops at the daily loop.
   *
   * ONCE PER USER, enforced by the resolver rather than here. `migratedFrom` is
   * set only on the resolve that creates journeyStates; every later launch
   * takes rung (a) and reports null. The local dismissal below only covers the
   * rest of this session.
   */
  if (weeklyLanding.migratedFrom && weeklyLanding.phase && !routeExplainerDismissed) {
    return (
      <MigrationRouteScreen
        destination={weeklyLanding.phase.destination}
        phaseKey={weeklyLanding.phase.phaseKey}
        onContinue={() => setRouteExplainerDismissed(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <View style={styles.headerActions}>
              {/* Docked Guide pill, left of Settings. Unconditional: the
                  pre-check-in hide existed to keep the check-in invite the
                  single focus, and that invite is gone. Session-hiding is
                  structural (session surfaces never mount the pill), so it does
                  NOT depend on this gate. */}
              <GuidePill context={{ screen: 'home' }} testID="home-guide" />
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never)}
                style={styles.settingsButton}
                accessibilityLabel="Settings"
              >
                <Icon name="cog-outline" size={28} color={Colors.evergreenTeal} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero band (reuses Focus/Energy's ScreenHeader + BAND_STRONG_SCRIM).
            Full-bleed; the in-code mist scrim fades both seams into the page so
            there is no hard image edge. contentPosition="center" frames this
            asset's panoramic subject (sun + mountain range + valley), which is
            spread across the frame rather than lower-third like Focus. The
            first content block below overlaps the bottom seam (marginBottom). */}
        <ScreenHeader
          source={homeHeader}
          mode="band"
          scrimLocations={BAND_STRONG_SCRIM}
          contentPosition="center"
          style={styles.headerBand}
        />

        {/* Error banner — non-blocking, shows which data failed */}
        {dataErrors.length > 0 && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.errorBannerText}>
              Could not load {dataErrors.join(', ')}. Pull to refresh.
            </Text>
          </View>
        )}

        {(
          <>
            {/* ---- The consolidated Today surface (landing slice). The old
                daily-engine check-in cards were removed in sub-step 3, so this
                hero is now the top of Home, not a layer above legacy cards. */}

            {/* The day's surface, from the current cycle. Only when the guard
                actually resolved 'today' — never from a stale cycle.

                `todayCard.protocol` IS NO LONGER PART OF THIS GATE. It used to
                be, and a null protocol blanked the continuity count and the
                close entry along with the hero. Those answer to the week, not
                to whether today has been picked, so they stay up in both
                states now. The hero alone swaps below. */}
            {weeklyLanding.target === 'today' && (weeklyLanding.cycle || weeklyLanding.phase) && (
                <>
                  {/* ---- The journey line (D1, roadmap section 9 R6) ----

                      ABOVE THE HERO, because the two questions run in that
                      order: where am I, then what should I do today. Below the
                      hero it would be a footnote to the day's action rather
                      than the context the day's action sits inside.

                      A TEXT ROW, NOT A CARD, so section 8's three-card ceiling
                      is untouched by it. It has no press target at all: a
                      tappable line here would be a second call to action above
                      the one real one. Rendered only under the journey, because
                      there is no phase to name on the legacy path. */}
                  {weeklyLanding.phase && (
                    <JourneyLine
                      label={JOURNEY_LINE_LABEL}
                      phaseKey={weeklyLanding.phase.phaseKey}
                      destination={weeklyLanding.phase.destination}
                    />
                  )}

                  {/* THE ONLY THING THE PICK GATES. Unpicked, the whole hero is
                      the prompt: no protocol title, no quick win, no completion
                      control, because there is no day's action to complete
                      until the user says what today is. Picked, the hero is
                      exactly what it has always been. */}
                  {todayCard.picked && todayCard.protocol ? (
                    <TodayHeroCard
                      /* Optional since slice 2. Under JOURNEY_IA a user whose
                         week has expired has a phase but no cycle, and the
                         card omits its week-summary line rather than naming a
                         week that is over. */
                      cycle={weeklyLanding.cycle}
                      /* Slice 4b. Labels the summary line for a cycle created
                         under the journey model, which carries no outcome.
                         Null on the legacy path, where the cycle labels
                         itself. */
                      destination={weeklyLanding.phase?.destination}
                      protocol={todayCard.protocol}
                      floorCommitment={todayCard.floorCommitment}
                      completed={todayCard.completed}
                      saving={todayCard.saving}
                      saveFailed={todayCard.saveFailed}
                      onMarkDone={todayCard.markDone}
                      /* Never rendered. Decides whether the done state shows
                         the variant's own acknowledgment or the plain line. */
                      consistentDays={todayCard.consistentDays}
                    />
                  ) : (
                    <SetTodayCard onPress={() => setPickerOpen(true)} />
                  )}

                  {/* Everything below the hero is SECONDARY, in the order it
                      carries on the weekly Today screen: continuity, then
                      close. Spec 9 allows Home one primary action and that is
                      the completion control inside the hero above, so neither
                      of these is filled and neither competes with it.

                      Gated on the same three conditions as the hero: a load
                      that failed shows no controls for a week it could not
                      read, which is how the Today screen behaves too.

                      THE CAPACITY RE-SET USED TO SIT HERE, between the hero and
                      the continuity count that slice 6 also retired, under its
                      own `!closeCompletedAt`
                      gate. It is retired (roadmap 3b-i): capacity is answered
                      per day now, so there is no weekly tier to re-plan. Its
                      gate went with it; the close acknowledgment below has
                      always been a sibling with its own `closed` prop and is
                      untouched by the removal. */}

                  {/* ---- The ONE journey-action slot (slice 7a decision 3) ----

                      THE CONTINUITY COUNT HELD THIS SLOT UNTIL SLICE 6 and was
                      retired outright (roadmap section 9 R4). What fills it now
                      is not a replacement for that count: the opacity concern
                      the count answered is still answered qualitatively, by the
                      app noticing out loud and by the journey visibly
                      progressing. What sits here is the app's one proactive
                      offer, and there is at most one of them.

                      EXACTLY ONE OF THESE RENDERS, EVER, and which one is
                      decided by journeyActionFor rather than by the order they
                      appear in below. Three sibling conditions on one variable,
                      never nested ternaries: the priority is a product rule
                      (capture beats adjust beats advance) and it is tested as a
                      function, not inferred from JSX by whoever reads it next.

                      Gated with the hero on the same three conditions: a load
                      that failed shows no controls for a week it could not
                      read, which is how the Today screen behaves too.

                      THE CAPACITY RE-SET USED TO SIT HERE TOO, under its own
                      `!closeCompletedAt` gate, and is retired (roadmap 3b-i):
                      capacity is answered per day now, so there is no weekly
                      tier to re-plan. The close entry below has always been a
                      sibling with its own `closed` prop and is untouched. */}
                  {journeyAction === 'capture' && (
                    <RemoveCaptureCard
                      onOpen={() => go(ROUTES.RemoveCapture)}
                      onDismiss={() => {
                        setCaptureDismissed(true);
                        if (user?.uid) {
                          logEvent(user.uid, 'journey_remove_capture_dismissed', {});
                        }
                      }}
                    />
                  )}

                  {/* 'adjust' IS DELIBERATELY UNRENDERED IN 7a. The branch is
                      real in journeyActionFor and pinned by an ordering test;
                      slice 7b supplies the C2 card that fills it. It cannot be
                      reached at runtime here because `adjustPlacement` is the
                      literal 'hidden' at the call site above, so this is a gap
                      with a lock on it rather than a hole. */}

                  {journeyAction === 'advance' && advanceOffer.door !== null && (
                    <AdvancementCard
                      variant={advanceOffer.door}
                      onSeeNext={openAdvancePreview}
                      onKeepGoing={advanceOffer.dismiss}
                    />
                  )}

                  {/* Start here, the Today instance (slice 7a; the container is
                      5c's and is not edited here).

                      A ROW, NOT A CARD, so it sits inside the ceiling rather
                      than becoming a fourth card. IT RENDERS NOTHING TODAY:
                      START_HERE_PATHS.today is null until Jen's video lands in
                      the bucket, and slice 5c decision 1 makes a null path and a
                      failed resolve the same outcome, which is absence. Mounted
                      now anyway, because the day the file exists the only change
                      is a string in constants/startHere.ts. */}
                  <StartHereRow
                    surface="today"
                    userId={user?.uid}
                    gloss={TODAY_START_HERE_GLOSS}
                    testID="home-start-here"
                  />

                  {/* Replaced by a plain acknowledgment once the week has been
                      closed. closeCompletedAt rides in on the cycle already
                      (getWeeklyCyclesForUser spreads the document), and this is
                      the first place in the app that reads it. */}
                  {/* GATED ON THE CYCLE, not on the Today block. The close
                      belongs to a week, and under JOURNEY_IA the block can
                      render for a user who has a phase and no live week. There
                      is nothing to close in that state, so the entry is absent
                      rather than pointing at a week that does not exist. */}
                  {!!weeklyLanding.cycle && (
                    <CloseWeekEntry
                      closed={!!weeklyLanding.cycle.closeCompletedAt}
                      cycle={weeklyLanding.cycle}
                      /* Slice 4b, same reason as the hero above. */
                      destination={weeklyLanding.phase?.destination}
                      onPress={openClose}
                    />
                  )}

                  {/* Mounted only while open, so its local answer state starts
                      from the pre-fill each time rather than from whatever the
                      user tapped and abandoned yesterday. */}
                  {pickerOpen && (
                    <DailyPickerSheet
                      visible
                      initialCapacity={todayCard.prefillCapacity}
                      initialTime={todayCard.prefillTime}
                      saving={todayCard.pickSaving}
                      saveFailed={todayCard.pickFailed}
                      onConfirm={async (capacity, time) => {
                        await todayCard.confirmPick(capacity, time);
                        setPickerOpen(false);
                      }}
                      onDismiss={() => setPickerOpen(false)}
                    />
                  )}
                </>
              )}

            {/* OpenYourWeekCard STOOD HERE and is deleted with the weekly open
                (journey slice 3b). It was the standing entry for a user who
                declined the pushed open, and there is no longer a push to
                decline: an expired week rolls over in the landing and Home
                renders 'today'. A card inviting the user to do the thing the
                app has already done would be an odd request. */}

            {/* First-shift footer — suppressed on the reworked Home (not in the
                spec set). Reversible via DASHBOARD_SUPPRESS. */}
            {!DASHBOARD_SUPPRESS.firstShiftFooter && (
              <FirstShiftFooter
                firstShiftAt={firstShiftAt}
                userId={user?.uid}
              />
            )}

            {/* NOTE: the slim 2-minute reset row is no longer rendered here
                (landing slice, sub-step 4). It pointed into the deleted check-in
                flow, and it wedged between the hero and the content block. The
                component and its test are deliberately RETAINED as the seam the
                need-something-now fast-follow re-points at a live target. */}

            {/* Content cards, subordinate to the Today hero above, in fixed
                order: Insight → This week → Routine. The habit grid sits above
                the routine card: it is the surface a returning user comes to
                check, so it should not sit below a card they may have already
                acted on. */}
            <View>
              <InsightCard />

              {/* This week's habits — the user's own consistency, shown back to
                  them neutrally. Only today is interactive; `handleHabitToggle`
                  is never handed a past date (see WeeklyHabitGrid). Self-hides
                  when there are no habits. The tap-through goes to the Time
                  tab's habits sub-tab, the same target the routine card uses.
                  HabitDetail needs the full habit object, not just its id. */}
              <WeeklyHabitGrid
                habits={habits}
                completionsByHabit={allCompletions}
                optimisticCompletions={weeklyCompletions}
                processingHabits={processingHabits}
                onCompleteToday={handleHabitToggle}
                onOpenHabit={(habit) =>
                  go('HabitDetail', { habitId: habit.id, habit })
                }
                onViewAll={() => go(NAV_TARGETS.plan, { tab: 'habits' })}
                onAddHabit={() => go(NAV_TARGETS.plan, { tab: 'habits' })}
              />

              <RoutineCard
                routines={dashboardRoutines}
                completions={routineCompletions}
                onBeginRoutine={handleBeginRoutine}
                onNavigateToRoutines={() => go(NAV_TARGETS.plan, { tab: 'routines' })}
                onNavigateToHabits={() => go(NAV_TARGETS.plan, { tab: 'habits' })}
              />

              {/* Surviving system prompts (live-gated), after the content. */}
              {(['notifOptIn', 'eventCode'] as const).map((id) => (
                <React.Fragment key={id}>{renderSystemPrompt(id)}</React.Fragment>
              ))}

              {/* Insights' quiet launch home (B-3d.6): a de-emphasized look-back
                  row at the very bottom, below the routine card. Insights leaves
                  the tab IA under the four-pillar migration; this keeps it
                  reachable without a stats hero. */}
              <InsightsLookbackCard />
            </View>
          </>
        )}
      </Animated.ScrollView>

      {/* Event Code Sheet */}
      <EventCodeSheet
        visible={eventCodeSheetVisible}
        onDismiss={() => setEventCodeSheetVisible(false)}
        onSuccess={handleEventCodeSuccess}
      />

      {/* Routine Player Modal */}
      {activePlayerRoutine && (
        <ActiveRoutinePlayer
          visible={routinePlayerVisible}
          routine={activePlayerRoutine}
          onClose={handleCloseRoutinePlayer}
          onEditRoutine={() => {
            handleCloseRoutinePlayer();
            navigation.navigate(NAV_TARGETS.plan as never, { tab: 'routines' } as never);
          }}
          onComplete={handleRoutineComplete}
        />
      )}

      {/* Note capture — opens only after a flagged habit's completion has
          already been written, so the grid stays one tap. */}
      {noteTarget && (
        <HabitNoteSheet
          visible
          habitName={noteTarget.habitName}
          onSave={saveNote}
          onDismiss={dismissNote}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    // Comfortable bottom breathing room above the tab bar (the Guide is now a
    // top-right pill, so no bottom-FAB clearance is needed).
    paddingBottom: Spacing['2xl'],
  },
  header: {
    // Tight gap so the greeting and the header band read as one unit
    // (matches Focus/Energy).
    marginBottom: Spacing.xs,
  },
  headerBand: {
    // Full-bleed: cancel the ScrollView's horizontal padding on BOTH edges so
    // the band runs edge to edge with no right-edge clip. NOTE: this screen's
    // scrollContent uses Spacing.base (16), NOT Spacing.lg like Focus/Energy —
    // the negative margin MUST match the parent padding or the band overshoots.
    marginHorizontal: -Spacing.base,
    // Let the first content block below ride up onto the header's bottom (mist)
    // seam at the shared overlap depth. Content paints after the band (later
    // sibling), so it sits above the seam.
    marginBottom: -CARD_OVERLAP,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greeting: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: 26,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217,122,110,0.1)',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
  },
});

export default DashboardScreen;
