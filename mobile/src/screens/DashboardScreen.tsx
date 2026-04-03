/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Text } from 'react-native';
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
import { WeeklyHabitsCard } from '../components/dashboard/WeeklyHabitsCard';
import { AIDailyPlanCard } from '../components/dashboard/AIDailyPlanCard';
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import RoutinesCard from '../components/dashboard/RoutinesCard';
import { ActiveRoutinePlayer } from './Focus/ActiveRoutinePlayer';
import { BrainStateCheckin } from '../components/dashboard/BrainStateCheckin';
import { TodaysProtocolCard } from '../components/dashboard/TodaysProtocolCard';
import { DailyReflectionCard } from '../components/dashboard/DailyReflectionCard';
import NudgeCard from '../components/dashboard/NudgeCard';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { useDashboard } from '../hooks/useDashboard';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';

const DashboardScreen: React.FC = () => {
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
    brainStateCheckInLoading,
    handleBrainStateCheckIn,
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
  } = useDashboard();

  const { correlations } = useWeeklyCorrelations();
  const weekInsight = correlations ? selectWeekInsight(correlations) : null;

  if (dataLoading) {
    return <LoadingSpinner message="Loading your wellness dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
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

            {/* Event Code Card (new users < 48 hours, contextual) */}
            {showEventCodeCard && (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <EventCodeCard
                  onEnterCode={() => setEventCodeSheetVisible(true)}
                  onDismiss={handleEventCodeDismiss}
                />
              </View>
            )}

            {/* Position 1: Brain State Check-In */}
            <BrainStateCheckin
              currentCheckIn={brainStateCheckIn}
              onSelect={handleBrainStateCheckIn}
              loading={brainStateCheckInLoading}
            />

            {/* Position 2: Today's Protocol (only after check-in) */}
            {brainStateCheckIn && todaysProtocol && (
              <TodaysProtocolCard
                protocol={todaysProtocol}
                completed={brainStateCheckIn.protocolCompleted}
                onMarkCompleted={handleMarkProtocolCompleted}
              />
            )}

            {/* Nudge Card (after protocol, before habits) */}
            {nudgeSuggestion && (
              <NudgeCard
                suggestion={nudgeSuggestion}
                onAction={() => {
                  markFeatureVisited(nudgeSuggestion.feature);
                  navigation.navigate(nudgeSuggestion.screenName as never);
                }}
                onDismiss={dismissNudge}
              />
            )}

            {/* Daily Reflection (after all habits completed) */}
            {showDailyReflection && (
              <DailyReflectionCard
                onReflect={handleDailyReflection}
                onSkip={handleDailyReflectionSkip}
              />
            )}

            {/* Position 3: Weekly Habits Tracker */}
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

            {/* Position 5: Routines Card */}
            <RoutinesCard
              routines={dashboardRoutines}
              completions={routineCompletions}
              onBeginRoutine={handleBeginRoutine}
              onNavigateToRoutines={() => navigation.navigate('Rhythms' as never, { tab: 'routines' } as never)}
              onApplyTemplate={handleApplyRoutineTemplate}
            />

            {/* Position 4: Week Insight (always visible) */}
            <WeekInsightCard
              headline={weekInsight?.headline}
              supporting={weekInsight?.supporting}
              onPressFullStory={weekInsight ? () => navigation.navigate('Insights' as never) : undefined}
              empty={!weekInsight}
            />

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
              onGeneratePlan={handleGenerateDailyPlan}
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
              onGenerate={handleGenerateDailyPlan}
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
      </ScrollView>

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
