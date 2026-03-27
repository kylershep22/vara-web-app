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
  MorningCheckIn,
  WellnessScoreOptInCard,
  QuickActionsRow,
} from '../components/dashboard';
import { WeeklyHabitsCard } from '../components/dashboard/WeeklyHabitsCard';
import { AIDailyPlanCard } from '../components/dashboard/AIDailyPlanCard';
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import BrainHealthEducationCard from '../components/dashboard/BrainHealthEducationCard';
import { Colors, Spacing, Typography } from '../constants';
import { useDashboard } from '../hooks/useDashboard';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';

const DashboardScreen: React.FC = () => {
  const {
    navigation,
    dataLoading,
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
    morningCheckIn,
    morningCheckInLoading,
    showMorningCheckIn,
    setShowMorningCheckIn,
    handleMorningCheckInComplete,
    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,
    showWelcomeBack,
    setShowWelcomeBack,
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,
    handleRefresh,
  } = useDashboard();

  const { correlations } = useWeeklyCorrelations();
  const weekInsight = correlations ? selectWeekInsight(correlations) : null;
  const [weekInsightDismissed, setWeekInsightDismissed] = useState(false);

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
          onNavigateToHabits={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
          onAddHabit={() => navigation.navigate('Track' as never, { tab: 'habits', openCreateModal: true } as never)}
        />

        {/* Next Best Action Card */}
        <NextBestActionCard
          wellnessScore={wellnessScore}
          habits={habits}
          tasks={tasks}
          completedTodayHabits={completedToday}
          fourThreeTwoOne={fourThreeTwoOneEntry}
          lastJournalDate={lastJournalDate}
          hasMorningCheckIn={!!morningCheckIn}
          hasDailyPlan={!!dailyPlan}
          onGeneratePlan={handleGenerateDailyPlan}
          onMorningCheckIn={() => setShowMorningCheckIn(true)}
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

        {/* Brain Health Education Card */}
        <BrainHealthEducationCard />

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

        {/* Morning Check-In */}
        {showMorningCheckIn && !morningCheckIn && (
          <MorningCheckIn
            onComplete={handleMorningCheckInComplete}
            onDismiss={() => setShowMorningCheckIn(false)}
            loading={morningCheckInLoading}
          />
        )}
      </ScrollView>

      {/* Wellness Score Breakdown Modal */}
      <WellnessScoreBreakdown
        visible={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        score={wellnessScore}
        onNavigate={(route) => navigation.navigate(route as never)}
      />
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
