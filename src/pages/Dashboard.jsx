// src/pages/Dashboard.jsx
// V2 card-based dashboard layout — matches mobile V2.

import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';

import { useDashboardV2 } from '../hooks/useDashboardV2';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';

import BrainStateCheckin from '../components/dashboard/BrainStateCheckin';
import TodaysProtocolCard from '../components/dashboard/TodaysProtocolCard';
import DailyReflectionCard from '../components/dashboard/DailyReflectionCard';
import WeeklyHabitsCard from '../components/dashboard/WeeklyHabitsCard';
import WeekInsightCard from '../components/dashboard/WeekInsightCard';

export default function Dashboard() {
  const {
    userName,
    greeting,
    formattedDate,
    dataLoading,

    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateCheckIn,
    handleMarkProtocolCompleted,
    todaysProtocol,

    dailyReflection,
    showDailyReflection,
    handleDailyReflection,

    habits,
    weeklyCompletions,
    visibleDays,
    handleHabitToggle,
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
      <div className="max-w-2xl mx-auto px-vara-base py-vara-lg">

        {/* ==================== HEADER ==================== */}
        <h1 className="text-vara-2xl font-semibold text-soft-charcoal">
          {greeting}, {userName}
        </h1>
        <p className="text-vara-sm text-muted-sage-gray mt-1">{formattedDate}</p>

        {/* ==================== V2 CARDS ==================== */}
        <div className="space-y-vara-base mt-vara-lg">

          {/* 1. Brain State Check-In (always visible) */}
          <BrainStateCheckin
            currentCheckIn={brainStateCheckIn}
            onSelect={handleBrainStateCheckIn}
            loading={brainStateLoading}
          />

          {/* 2. Today's Protocol (after check-in) */}
          {brainStateCheckIn && todaysProtocol && (
            <TodaysProtocolCard
              brainState={brainStateCheckIn.brainState}
              protocolCompleted={brainStateCheckIn.protocolCompleted}
              onComplete={handleMarkProtocolCompleted}
            />
          )}

          {/* 3. Daily Reflection (after all habits done) */}
          {showDailyReflection && (
            <DailyReflectionCard
              reflection={dailyReflection}
              onSave={handleDailyReflection}
            />
          )}

          {/* 4. Weekly Habits Tracker (always visible) */}
          <WeeklyHabitsCard
            habits={habits.filter((h) => h.active !== false)}
            completions={weeklyCompletions}
            visibleDays={visibleDays}
            onToggle={handleHabitToggle}
          />

          {/* 5. Week Insight (conditional) */}
          {weekInsight && (
            <WeekInsightCard
              headline={weekInsight.headline}
              supporting={weekInsight.supporting}
            />
          )}

        </div>
      </div>
    </SidebarLayout>
  );
}
