/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedScrollHandler,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
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
import { WeeklyHabitsCard } from '../components/dashboard/WeeklyHabitsCard';
import { AIDailyPlanCard } from '../components/dashboard/AIDailyPlanCard';
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import RoutinesCard from '../components/dashboard/RoutinesCard';
import { ActiveRoutinePlayer } from './Focus/ActiveRoutinePlayer';
import { BrainStateCheckin } from '../components/dashboard/BrainStateCheckin';
import { OverwhelmSafetyCard } from '../components/dashboard/OverwhelmSafetyCard';
import { TodaysProtocolCard } from '../components/dashboard/TodaysProtocolCard';
import { DailyReflectionCard } from '../components/dashboard/DailyReflectionCard';
import NudgeCard from '../components/dashboard/NudgeCard';
import { DashboardAnchor } from '../components/dashboard/DashboardAnchor/DashboardAnchor';
import { LockedDivider } from '../components/dashboard/LockedDivider';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { useDashboard } from '../hooks/useDashboard';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';
import { useAIConsent } from '../context/AIConsentContext';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const DashboardScreen: React.FC = () => {
  const { requireConsent } = useAIConsent();
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
    handleMarkProtocolCompleted,
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

  const cardOpacity = useSharedValue(dashboardPhase === 'pre-checkin' ? 0.35 : 1);
  const blurIntensity = useSharedValue(dashboardPhase === 'pre-checkin' ? 15 : 0);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    cardOpacity.value = withTiming(
      dashboardPhase === 'pre-checkin' ? 0.35 : 1,
      { duration: 400 }
    );
    blurIntensity.value = withTiming(
      dashboardPhase === 'pre-checkin' ? 15 : 0,
      { duration: 400 }
    );
  }, [dashboardPhase]);

  const cardWrapperStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: blurIntensity.value,
  }));

  const isMuted = dashboardPhase === 'pre-checkin';

  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'protocol':
        return brainStateCheckIn && todaysProtocol ? (
          <TodaysProtocolCard
            key="protocol"
            protocol={todaysProtocol}
            completed={brainStateCheckIn.protocolCompleted}
            onMarkCompleted={handleMarkProtocolCompleted}
          />
        ) : null;
      case 'notifOptIn':
        // Skip in pre-checkin; it's rendered above the muted wrapper in
        // that phase so it stays interactive (treated as a setting).
        if (isMuted) return null;
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
        return showDailyReflection ? (
          <DailyReflectionCard
            key="reflection"
            onReflect={handleDailyReflection}
            onSkip={handleDailyReflectionSkip}
          />
        ) : null;
      case 'habits':
        return (
          <WeeklyHabitsCard
            key="habits"
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
        );
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
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
                  protocolCompleted={brainStateCheckIn.protocolCompleted}
                  checkInDate={brainStateCheckIn.date}
                  onChangeStatePress={() => setShowCheckInOverAnchor(true)}
                  scrollY={scrollY}
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

            {/* Pre-checkin locked divider */}
            {dashboardPhase === 'pre-checkin' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
              >
                <LockedDivider />
              </Animated.View>
            )}

            {/* Dashboard cards: muted + blurred in pre-checkin, ordered by brain state */}
            <Animated.View
              style={[cardWrapperStyle]}
              pointerEvents={isMuted ? 'none' : 'auto'}
            >
              {cardOrder.map((cardId) => renderCard(cardId))}
              <AnimatedBlurView
                animatedProps={blurAnimatedProps}
                tint="light"
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </Animated.View>
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
