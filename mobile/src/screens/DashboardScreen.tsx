/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../components';
import {
  FourThreeTwoOneCard,
  BrainHealthInsightStrip,
  NextBestActionCard,
  WellnessScoreCard,
  WellnessScoreBreakdown,
  WellnessScoreOptInCard,
  QuickActionsRow,
} from '../components/dashboard';
import { AIDailyPlanCard } from '../components/dashboard/AIDailyPlanCard';
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import RoutinesCard from '../components/dashboard/RoutinesCard';
import { ActiveRoutinePlayer } from './Focus/ActiveRoutinePlayer';
import { BrainStateCheckin } from '../components/dashboard/BrainStateCheckin';
import { OverwhelmSafetyCard } from '../components/dashboard/OverwhelmSafetyCard';
import { FirstShiftFooter } from '../components/dashboard/FirstShiftFooter';
import { TodaysProtocolCard } from '../components/dashboard/TodaysProtocolCard';
import { DailyReflectionCard } from '../components/dashboard/DailyReflectionCard';
import NudgeCard from '../components/dashboard/NudgeCard';
import { DashboardAnchor } from '../components/dashboard/DashboardAnchor/DashboardAnchor';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { DASHBOARD_V2, DASHBOARD_SUPPRESS } from '../constants/dashboardConfig';
import { useDashboard } from '../hooks/useDashboard';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';
import { useAIConsent } from '../context/AIConsentContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';

const DashboardScreen: React.FC = () => {
  const { requireConsent } = useAIConsent();
  const { user } = useAuth();
  const {
    navigation,
    dataLoading,
    dataErrors,
    refreshing,
    greeting,
    formattedDate,
    today,
    visibleDays,
    habits,
    allCompletions,
    processingHabits,
    weeklyCompletions,
    handleHabitToggle,
    tasks,
    completedToday,
    lastJournalDate,
    dailyPlan,
    generatingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    handleGenerateDailyPlan,
    wellnessScore,
    wellnessScoreLoading,
    showScoreBreakdown,
    setShowScoreBreakdown,
    wellnessScoreEnabled,
    showOptInPrompt,
    setShowOptInPrompt,
    handleRefreshWellnessScore,
    handleWellnessScoreEnable,
    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,
    showWelcomeBack,
    setShowWelcomeBack,
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,
    handleRefresh,
    brainStateCheckIn,
    todaysProtocol,
    showDailyReflection,
    handleDailyReflection,
    handleDailyReflectionSkip,
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
    handleApplyRoutineTemplate,
    dashboardPhase,
    cardOrder,
  } = useDashboard();

  const { correlations } = useWeeklyCorrelations();
  const weekInsight = correlations ? selectWeekInsight(correlations) : null;

  const [showCheckInOverAnchor, setShowCheckInOverAnchor] = useState(false);

  // Round 10 (Finding 1 fix) — reset showCheckInOverAnchor whenever
  // the dashboard regains focus. The Change-button flow sets this to
  // true to swap DashboardAnchor → BrainStateCheckin (expanded
  // picker), but only the user's tap sets it; nothing reset it back
  // to false. After a successful Change → CheckInFlow → return,
  // brainStateCheckIn was correctly refetched but showCheckInOverAnchor
  // stayed sticky-true, leaving the expanded picker visible as if
  // the new check-in hadn't happened.
  //
  // Resetting on focus honors the intent: the expanded picker is a
  // transient mode the user enters by explicit tap. Any return to
  // the dashboard from elsewhere — completed flow, cancelled flow,
  // backgrounded app — implies the user is no longer in that mode.
  // The Cancel-mid-flow path benefits too: the user lands back on
  // the summary view of their original (still-valid) check-in.
  useFocusEffect(
    useCallback(() => {
      setShowCheckInOverAnchor(false);
    }, [])
  );

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

  // Phase 2.8.1 — hide the global FAB during the focused brain-state
  // check-in entry flow (dashboardPhase === 'pre-checkin'). When the
  // user completes (or skips) the check-in and the phase transitions
  // to 'checked-in', the FAB returns. Dashboard's Stack.Screen
  // declares showFAB: true; this override applies for the screen's
  // lifetime in the tab stack. Cast bypasses the excess-property
  // check on the navigator's options type (see navigation/types.ts).
  useEffect(() => {
    navigation.setOptions(
      { showFAB: dashboardPhase === 'checked-in' } as any
    );
  }, [navigation, dashboardPhase]);

  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'protocol':
        // Sub-step 2.7 fix (Observation 3): TodaysProtocolCard is
        // informational-only after the V1 self-attest UI removal. The
        // mount is guarded on protocolCompleted=true; the pre-completion
        // case (e.g. user abandoned a CheckInFlow) hides the card
        // rather than rendering the now-removed Begin/Done UX. Users
        // re-engage via the chip-tap surface (BrainStateCheckin) or
        // via Change on the DashboardAnchor card.
        return brainStateCheckIn &&
          todaysProtocol &&
          brainStateCheckIn.protocolCompleted ? (
          <TodaysProtocolCard key="protocol" protocol={todaysProtocol} />
        ) : null;
      case 'notifOptIn':
        // Skip in pre-checkin; it's rendered separately in that phase (above)
        // so it stays interactive as a setting. (NotificationOptIn is left
        // rendering as-is pending the confirm on whether it's a live entry.)
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
        return showEventCodeCard ? (
          <View key="eventCode" style={{ paddingHorizontal: Spacing.base }}>
            <EventCodeCard
              onEnterCode={() => setEventCodeSheetVisible(true)}
              onDismiss={handleEventCodeDismiss}
            />
          </View>
        ) : null;
      case 'nudge':
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
      case 'reflection':
        // Suppressed on the reworked Home (end-of-day reflection is a different
        // surface, not in the spec set). Reversible via DASHBOARD_SUPPRESS.
        if (DASHBOARD_SUPPRESS.dailyReflection) return null;
        return showDailyReflection ? (
          <DailyReflectionCard
            key="reflection"
            onReflect={handleDailyReflection}
            onSkip={handleDailyReflectionSkip}
          />
        ) : null;
      case 'routines':
        return (
          <RoutinesCard
            key="routines"
            routines={dashboardRoutines}
            completions={routineCompletions}
            onBeginRoutine={handleBeginRoutine}
            onNavigateToRoutines={() => navigation.navigate('Rhythms' as never, { tab: 'routines' } as never)}
            onApplyTemplate={handleApplyRoutineTemplate}
          />
        );
      case 'weekInsight':
        // Only render when there's a real insight. When the user has fewer
        // than ~3 days of check-in data, no correlation in selectWeekInsight
        // reaches significance and it returns null. We suppress the card
        // entirely in that case rather than showing a "come back later"
        // placeholder, per the voice guide's rule against empty-data cards.
        if (!weekInsight) return null;
        return (
          <WeekInsightCard
            key="weekInsight"
            headline={weekInsight.headline}
            supporting={weekInsight.supporting}
            onPressFullStory={() => navigation.navigate('Insights' as never)}
          />
        );
      default:
        return null;
    }
  };

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
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never)}
              style={styles.settingsButton}
              accessibilityLabel="Settings"
            >
              <Icon name="cog-outline" size={28} color={Colors.evergreenTeal} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error banner — non-blocking, shows which data failed */}
        {dataErrors.length > 0 && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.errorBannerText}>
              Could not load {dataErrors.join(', ')}. Pull to refresh.
            </Text>
          </View>
        )}

        {DASHBOARD_V2 ? (
          <>
            {/* Phase-dependent top section */}
            {dashboardPhase === 'checked-in' && brainStateCheckIn && (
              showCheckInOverAnchor ? (
                <BrainStateCheckin
                  currentCheckIn={brainStateCheckIn}
                />
              ) : (
                <DashboardAnchor
                  brainState={brainStateCheckIn.brainState}
                  onChangeStatePress={() => setShowCheckInOverAnchor(true)}
                />
              )
            )}

            {/* Brain State Check-In (only visible in pre-checkin phase).
                Sub-step 2.5 — chip tap navigates to CheckInFlow; the
                save no longer happens here in the dashboard. */}
            {dashboardPhase === 'pre-checkin' && (
              <BrainStateCheckin
                currentCheckIn={brainStateCheckIn}
              />
            )}

            {/* First-shift footer — suppressed on the reworked Home (not in the
                spec set). Reversible via DASHBOARD_SUPPRESS. */}
            {!DASHBOARD_SUPPRESS.firstShiftFooter && (
              <FirstShiftFooter
                firstShiftAt={firstShiftAt}
                userId={user?.uid}
              />
            )}

            {/* Overwhelm Safety Card — sub-step 2.6. Always visible
                (no surfacing-trigger logic in v1; Phase 5 layers
                in path-specific thresholds). Below the brain-state
                check-in card per the locked decision; 2.7 device-
                verification screenshots iPhone 12/SE/15 confirm
                this stays above the fold without scrolling. */}
            <OverwhelmSafetyCard />

            {/* Notification opt-in: treated as a setting, accessible in every
                phase. In post-checkin / returning it renders inside cardOrder
                after protocol. In pre-checkin it renders here, above the
                muted wrapper, so it stays fully interactive. */}
            {dashboardPhase === 'pre-checkin' && notifOptInCard && (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <NotificationOptInCard
                  category={notifOptInCard}
                  onOptIn={() => handleNotifOptIn(notifOptInCard)}
                  onDismiss={() => handleNotifDismiss(notifOptInCard)}
                />
              </View>
            )}

            {/* Dashboard cards — calm, ordered by brain state. The pre-checkin
                blur-gate + locked divider are removed: the rework's calm cards
                are visible in both phases. */}
            <View>
              {cardOrder.map((cardId) => renderCard(cardId))}
            </View>
          </>
        ) : (
          <>
            {/* ========== V1 DASHBOARD LAYOUT ========== */}

            {/* Welcome Back Card (returning users, 3+ days away) */}
            {showWelcomeBack && (
              <WelcomeBackCard
                onDismiss={() => {
                  setShowWelcomeBack(false);
                }}
              />
            )}

            {/* Notification Opt-In Card (progressive disclosure) */}
            {notifOptInCard && (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <NotificationOptInCard
                  category={notifOptInCard}
                  onOptIn={() => handleNotifOptIn(notifOptInCard)}
                  onDismiss={() => handleNotifDismiss(notifOptInCard)}
                />
              </View>
            )}

            {/* Weekly Habits Tracker */}
            <WeeklyHabitsCard
              habits={habits}
              visibleDays={visibleDays}
              today={today}
              allCompletions={allCompletions}
              weeklyCompletions={weeklyCompletions}
              processingHabits={processingHabits}
              onHabitToggle={handleHabitToggle}
              onNavigateToHabits={() => navigation.navigate('Rhythms' as never, { tab: 'habits' } as never)}
              onAddHabit={() => navigation.navigate('Rhythms' as never, { tab: 'habits', openCreateModal: true } as never)}
            />

            {/* Next Best Action Card */}
            <NextBestActionCard
              wellnessScore={wellnessScore}
              habits={habits}
              tasks={tasks}
              completedTodayHabits={completedToday}
              fourThreeTwoOne={fourThreeTwoOneEntry}
              lastJournalDate={lastJournalDate}
              hasMorningCheckIn={true}
              hasDailyPlan={!!dailyPlan}
              onGeneratePlan={() => requireConsent(handleGenerateDailyPlan)}
              onMorningCheckIn={() => {}}
            />

            {/* Quick Actions Row */}
            <QuickActionsRow
              onJournalPress={() => navigation.navigate('Journal' as never)}
              onReflectPress={() => navigation.navigate('Focus' as never)}
            />

            {/* --- Below fold --- */}

            {/* 4-3-2-1 Daily Practice */}
            <FourThreeTwoOneCard onChange={handleFourThreeTwoOneChange} defaultCollapsed={true} />

            {/* Week Insight Card */}
            {weekInsight && !weekInsightDismissed && (
              <WeekInsightCard
                headline={weekInsight.headline}
                supporting={weekInsight.supporting}
                onPressFullStory={() => navigation.navigate('Insights' as never)}
                onDismiss={() => setWeekInsightDismissed(true)}
              />
            )}


            {/* AI Daily Plan Card */}
            <AIDailyPlanCard
              dailyPlan={dailyPlan}
              generatingPlan={generatingPlan}
              isPlanExpanded={isPlanExpanded}
              onToggleExpand={() => setIsPlanExpanded(!isPlanExpanded)}
              onGenerate={() => requireConsent(handleGenerateDailyPlan)}
            />

            {/* Brain Health Insight Strip */}
            <BrainHealthInsightStrip compact />

            {/* Wellness Score Opt-In */}
            {wellnessScoreEnabled === false && showOptInPrompt && (
              <WellnessScoreOptInCard
                onEnable={handleWellnessScoreEnable}
                onDismiss={() => setShowOptInPrompt(false)}
              />
            )}

            {/* Wellness Score Card */}
            {wellnessScoreEnabled && (
              <WellnessScoreCard
                score={wellnessScore}
                loading={wellnessScoreLoading}
                onPress={() => setShowScoreBreakdown(true)}
                onRefresh={handleRefreshWellnessScore}
              />
            )}


          </>
        )}
      </Animated.ScrollView>

      {/* Wellness Score Breakdown Modal (V1 only) */}
      {!DASHBOARD_V2 && (
        <WellnessScoreBreakdown
          visible={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          score={wellnessScore}
          onNavigate={(route) => navigation.navigate(route as never)}
        />
      )}

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
            navigation.navigate('Rhythms' as never, { tab: 'routines' } as never);
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
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
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
