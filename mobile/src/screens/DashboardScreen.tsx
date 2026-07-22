/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../components';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import { ActiveRoutinePlayer } from './Time/ActiveRoutinePlayer';
import { NAV_TARGETS } from '../navigation/navTargets';
import { CheckInInvite } from '../components/dashboard/CheckInInvite';
import { SlimResetAffordance } from '../components/dashboard/SlimResetAffordance';
import { RightNowAcknowledgment } from '../components/dashboard/RightNowAcknowledgment';
import { SuggestedActionCard } from '../components/dashboard/SuggestedActionCard';
import { InsightCard } from '../components/dashboard/InsightCard';
import { RoutineCard } from '../components/dashboard/RoutineCard';
import { WeeklyHabitGrid } from '../components/dashboard/WeeklyHabitGrid';
import { InsightsLookbackCard } from '../components/dashboard/InsightsLookbackCard';
import { suggestedAction } from '../components/dashboard/suggestedAction';
import { FirstShiftFooter } from '../components/dashboard/FirstShiftFooter';
import NudgeCard from '../components/dashboard/NudgeCard';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { ScreenHeader, BAND_STRONG_SCRIM } from '../components/shared/ScreenHeader';
import { GuidePill } from '../components/ai/GuidePill';
import { DASHBOARD_SUPPRESS } from '../constants/dashboardConfig';

// The one illustration on Home: a watercolor header band. Raster asset (WebP)
// rendered via ScreenHeader's expo-image layer, never an SVG icon.
const homeHeader = require('../../assets/images/homeHeader.webp');

// How far the first content block rides up onto the header's bottom (mist) seam
// — matches Focus/Energy so the overlap reads identically across heroes.
const CARD_OVERLAP = Spacing.xl;
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';

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
    brainStateCheckIn,
    todaysProtocol,
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,
    showEventCodeCard,
    eventCodeSheetVisible,
    setEventCodeSheetVisible,
    handleEventCodeDismiss,
    handleEventCodeSuccess,
    nudgeSuggestion,
    dismissNudge,
    markFeatureVisited,
    dashboardRoutines,
    routineCompletions,
    activePlayerRoutine,
    routinePlayerVisible,
    handleBeginRoutine,
    handleCloseRoutinePlayer,
    handleRoutineComplete,
    dashboardPhase,
    habits,
    allCompletions,
    weeklyCompletions,
    processingHabits,
    handleHabitToggle,
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
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      const value = (data?.firstShiftAt as Timestamp | undefined) ?? null;
      setFirstShiftAt(value);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // System prompts that survive the rework, rendered after the spec content
  // cards. NotificationOptIn / EventCode are left as-is pending the live-entry
  // confirm; the nudge is kept because it's already live-gated (transient).
  const renderSystemPrompt = (cardId: 'notifOptIn' | 'eventCode' | 'nudge') => {
    switch (cardId) {
      case 'notifOptIn':
        if (DASHBOARD_SUPPRESS.notifOptIn) return null;
        // Skip in pre-checkin; it renders separately there (above) as a setting.
        if (dashboardPhase === 'pre-checkin') return null;
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
      case 'nudge':
        if (DASHBOARD_SUPPRESS.nudge) return null;
        return nudgeSuggestion ? (
          <NudgeCard
            key="nudge"
            suggestion={nudgeSuggestion}
            onAction={() => {
              markFeatureVisited(nudgeSuggestion.feature);
              navigation.navigate(nudgeSuggestion.screenName as never);
            }}
            onDismiss={dismissNudge}
          />
        ) : null;
    }
  };

  // The standing capacity practice for the post-check-in surface — time-of-day
  // driven, independent of any just-completed plan.
  const suggestion = suggestedAction();

  // Post-check-in acknowledgment: name what the user DID (a completed catalog
  // practice), never the state they reported. Renders only when a practice
  // actually completed today — a pointer hand-off / zero-slot / not-yet-started
  // check-in leaves protocolCompleted false, so the slot collapses and the
  // SuggestedActionCard below is the forward-pointing element. completedAt drives
  // the "done this morning/afternoon/evening" variant; sourced from the daily
  // marker's updatedAt (no dedicated completion timestamp exists — a same-day
  // same-state re-check would move it).
  const practiceCompleted =
    brainStateCheckIn?.protocolCompleted === true && todaysProtocol != null;
  const completedAt = practiceCompleted
    ? brainStateCheckIn?.updatedAt?.toDate?.() ?? null
    : null;

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
              {/* Docked Guide pill, left of Settings. Hidden pre-check-in so the
                  check-in invite stays the single focus (matches the FAB's old
                  pre-check-in hide); returns once the user has checked in. */}
              {dashboardPhase === 'checked-in' && (
                <GuidePill context={{ screen: 'home' }} testID="home-guide" />
              )}
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
            {/* Post-checkin: acknowledge what the user DID (a completed
                practice), never the state they reported. Self-collapses when no
                practice completed — see practiceCompleted above. */}
            {dashboardPhase === 'checked-in' && (
              <RightNowAcknowledgment
                practiceName={practiceCompleted ? todaysProtocol!.name : null}
                completedAt={completedAt}
              />
            )}

            {/* Pre-checkin: the ONE bright check-in invite (the priority). */}
            {dashboardPhase === 'pre-checkin' && <CheckInInvite />}

            {/* First-shift footer — suppressed on the reworked Home (not in the
                spec set). Reversible via DASHBOARD_SUPPRESS. */}
            {!DASHBOARD_SUPPRESS.firstShiftFooter && (
              <FirstShiftFooter
                firstShiftAt={firstShiftAt}
                userId={user?.uid}
              />
            )}

            {/* Slim 2-minute reset — present in both phases, quiet (not a card),
                reusing the locked overwhelm entry. */}
            <SlimResetAffordance />

            {/* Notification opt-in: treated as a setting, accessible in every
                phase. In post-checkin / returning it renders inside cardOrder
                after protocol. In pre-checkin it renders here, above the
                muted wrapper, so it stays fully interactive. */}
            {!DASHBOARD_SUPPRESS.notifOptIn &&
              dashboardPhase === 'pre-checkin' &&
              notifOptInCard && (
                <View style={{ paddingHorizontal: Spacing.base }}>
                  <NotificationOptInCard
                    category={notifOptInCard}
                    onOptIn={() => handleNotifOptIn(notifOptInCard)}
                    onDismiss={() => handleNotifDismiss(notifOptInCard)}
                  />
                </View>
              )}

            {/* Spec content cards — explicit, fixed order (no longer
                brain-state-ordered): Suggested action (post only) → Insight →
                Routine. */}
            <View>
              {dashboardPhase === 'checked-in' && suggestion && (
                <SuggestedActionCard
                  protocol={suggestion.protocol}
                  onStart={() =>
                    go('PracticeRun', {
                      protocolId: suggestion.protocol.id,
                      stateBefore: brainStateCheckIn?.brainState ?? 'steady',
                    })
                  }
                />
              )}

              <InsightCard />

              <RoutineCard
                routines={dashboardRoutines}
                completions={routineCompletions}
                onBeginRoutine={handleBeginRoutine}
                onNavigateToRoutines={() => go(NAV_TARGETS.plan, { tab: 'routines' })}
                onNavigateToHabits={() => go(NAV_TARGETS.plan, { tab: 'habits' })}
              />

              {/* This week's habits — the user's own consistency, shown back to
                  them neutrally. Only today is interactive; `handleHabitToggle`
                  is never handed a past date (see WeeklyHabitGrid). Self-hides
                  when there are no habits. The overflow tap-through goes to the
                  Time tab's habits sub-tab, the same target the routine card
                  uses. HabitDetail needs the full habit object, not just its
                  id. */}
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

              {/* Surviving system prompts (live-gated), after the content. */}
              {(['notifOptIn', 'eventCode', 'nudge'] as const).map((id) => (
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
