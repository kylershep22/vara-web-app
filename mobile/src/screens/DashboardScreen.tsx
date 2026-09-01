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

// The one illustration on Home: a watercolor header band. Raster asset (WebP)
// rendered via ScreenHeader's expo-image layer, never an SVG icon.
const homeHeader = require('../../assets/images/homeHeader.webp');

// How far the first content block rides up onto the header's bottom (mist) seam
// — matches Focus/Energy so the overlap reads identically across heroes.
const CARD_OVERLAP = Spacing.xl;
import { TodayHeroCard } from '../components/dashboard/TodayHeroCard';
import { SetTodayCard } from '../components/dashboard/SetTodayCard';
import { DailyPickerSheet } from '../components/dashboard/DailyPickerSheet';
import { OpenYourWeekCard } from '../components/dashboard/OpenYourWeekCard';
import { ContinuityCard } from '../components/dashboard/ContinuityCard';
import { CloseWeekEntry } from '../components/dashboard/CloseWeekEntry';
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

  // The weekly close (spec 8). `navigate`, not `replace`: Home is a tab, so the
  // close is pushed OVER it exactly as the floor and open flows are below.
  const goToClose = useCallback(() => {
    (navigation as unknown as { navigate: (s: string) => void }).navigate(
      ROUTES.WeeklyClose
    );
    // navigation is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const pushedForRef = useRef<'floor' | 'open' | null>(null);
  useEffect(() => {
    const target = weeklyLanding.target;
    if (target === 'today' || target === null) {
      // Resolved into the app: clear the latch so a later week boundary can
      // push again without a remount.
      pushedForRef.current = null;
      return;
    }
    if (pushedForRef.current === target) return;
    pushedForRef.current = target;
    // Navigates directly rather than through the `go` helper below: that helper
    // is declared later in this component, and an effect that depends on
    // declaration order is a trap for the next edit.
    (navigation as unknown as { navigate: (s: string) => void }).navigate(
      target === 'floor' ? ROUTES.WeeklyFloor : ROUTES.WeeklyOpen
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
                      protocol={todayCard.protocol}
                      floorCommitment={todayCard.floorCommitment}
                      completed={todayCard.completed}
                      saving={todayCard.saving}
                      saveFailed={todayCard.saveFailed}
                      onMarkDone={todayCard.markDone}
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
                      the continuity count, under its own `!closeCompletedAt`
                      gate. It is retired (roadmap 3b-i): capacity is answered
                      per day now, so there is no weekly tier to re-plan. Its
                      gate went with it; the close acknowledgment below has
                      always been a sibling with its own `closed` prop and is
                      untouched by the removal. */}

                  {/* Self-hides at 0 and on a failed read; see ContinuityCard. */}
                  <ContinuityCard continuity={todayCard.continuity} />

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

            {/* Standing entry for the user who declined the pushed open. Home
                pushes once per target so backing out cannot trap them, and this
                card is what stops that latch from turning Home into a dead end
                with no week. */}
            {weeklyLanding.target === 'open' && (
              <OpenYourWeekCard onOpen={() => go(ROUTES.WeeklyOpen)} />
            )}

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
