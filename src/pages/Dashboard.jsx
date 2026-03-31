// src/pages/Dashboard.jsx
// Card-based dashboard layout — state lives in useDashboardV2.

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';

import { useDashboardV2 } from '../hooks/useDashboardV2';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';

import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import MorningCheckInCard from '../components/dashboard/MorningCheckInCard';
import WeeklyHabitsCard from '../components/dashboard/WeeklyHabitsCard';
import NextBestActionCard from '../components/dashboard/NextBestActionCard';
import QuickActionsRow from '../components/dashboard/QuickActionsRow';
import FourThreeTwoOneCard from '../components/dashboard/FourThreeTwoOneCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import BrainHealthEducationCard from '../components/dashboard/BrainHealthEducationCard';
import AIDailyPlanCard from '../components/dashboard/AIDailyPlanCard';
import WellnessScoreCard from '../components/dashboard/WellnessScoreCard';
import WellnessScoreBreakdown from '../components/dashboard/WellnessScoreBreakdown';
import BrainHealthInsightStrip from '../components/dashboard/BrainHealthInsightStrip';

export default function Dashboard() {
  const {
    user,
    userName,
    greeting,
    formattedDate,
    dataLoading,

    showWelcomeBack,
    dismissWelcomeBack,

    morningCheckIn,
    showMorningCheckIn,
    handleMorningCheckInComplete,

    habits,
    weeklyCompletions,
    visibleDays,
    handleHabitToggle,

    recommendation,

    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,

    dailyPlan,
    generatingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    handleGenerateDailyPlan,

    wellnessScore,
    wellnessScoreLoading,
    wellnessScoreEnabled,
    showScoreBreakdown,
    setShowScoreBreakdown,
    handleRefreshWellnessScore,
    handleWellnessScoreEnable,
  } = useDashboardV2();

  const { correlations } = useWeeklyCorrelations();
  const weekInsight = correlations ? selectWeekInsight(correlations) : null;

  if (dataLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-evergreen-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-vara-sm text-muted-sage-gray">Loading your dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">

        {/* ==================== HEADER ==================== */}
        <h1 className="text-vara-2xl font-semibold text-soft-charcoal">
          {greeting}, {userName}
        </h1>
        <p className="text-vara-sm text-muted-sage-gray mt-1">{formattedDate}</p>

        {/* ==================== CARD GRID ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base mt-vara-lg">

          {/* Full-width: Welcome Back */}
          {showWelcomeBack && (
            <div className="lg:col-span-2">
              <WelcomeBackCard onDismiss={dismissWelcomeBack} />
            </div>
          )}

          {/* Full-width: Morning Check-In */}
          {showMorningCheckIn && (
            <div className="lg:col-span-2">
              <MorningCheckInCard
                userId={user?.uid}
                checkIn={morningCheckIn}
                onComplete={handleMorningCheckInComplete}
              />
            </div>
          )}

          {/* Full-width: Weekly Habits Grid */}
          <div className="lg:col-span-2">
            <WeeklyHabitsCard
              habits={habits.filter((h) => h.active !== false)}
              completions={weeklyCompletions}
              visibleDays={visibleDays}
              onToggle={handleHabitToggle}
            />
          </div>

          {/* Single column: Next Best Action */}
          <NextBestActionCard recommendation={recommendation} />

          {/* Single column: Quick Actions */}
          <QuickActionsRow />

          {/* Full-width: 4-3-2-1 */}
          <div className="lg:col-span-2">
            <FourThreeTwoOneCard
              entry={fourThreeTwoOneEntry}
              onChange={handleFourThreeTwoOneChange}
              userId={user?.uid}
            />
          </div>

          {/* Full-width: Week Insight (only when there's a correlation) */}
          {weekInsight && (
            <div className="lg:col-span-2">
              <WeekInsightCard
                headline={weekInsight.headline}
                supporting={weekInsight.supporting}
              />
            </div>
          )}

          {/* Full-width: Brain Health Education */}
          <div className="lg:col-span-2">
            <BrainHealthEducationCard />
          </div>

          {/* Full-width: AI Daily Plan */}
          <div className="lg:col-span-2">
            <AIDailyPlanCard
              plan={dailyPlan}
              generating={generatingPlan}
              onGenerate={handleGenerateDailyPlan}
              expanded={isPlanExpanded}
              onToggleExpand={() => setIsPlanExpanded((prev) => !prev)}
            />
          </div>

          {/* Single column: Wellness Score */}
          <WellnessScoreCard
            score={wellnessScore}
            loading={wellnessScoreLoading}
            enabled={wellnessScoreEnabled}
            onRefresh={handleRefreshWellnessScore}
            onEnable={handleWellnessScoreEnable}
            onShowBreakdown={() => setShowScoreBreakdown(true)}
          />

          {/* Full-width: Brain Health Insight Strip */}
          <div className="lg:col-span-2">
            <BrainHealthInsightStrip />
          </div>

        </div>
      </div>

      {/* ==================== MODALS ==================== */}
      {showScoreBreakdown && (
        <WellnessScoreBreakdown
          score={wellnessScore}
          onClose={() => setShowScoreBreakdown(false)}
        />
      )}
    </SidebarLayout>
  );
}
