import React from "react";
import SidebarLayout from "../components/layout/SidebarLayout";

import { useDashboardV2 } from "../hooks/useDashboardV2";

import BrainStateCheckin from "../components/dashboard/BrainStateCheckin";
import TodaysProtocolCard from "../components/dashboard/TodaysProtocolCard";
import DailyReflectionCard from "../components/dashboard/DailyReflectionCard";
import WeeklyHabitsTracker from "../components/dashboard/WeeklyHabitsTracker";

export default function Dashboard() {
  const {
    user,
    userName,
    greeting,
    formattedDate,
    dataLoading,

    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateSelect,

    handleProtocolComplete,

    habits,
    habitCompletions,
    handleHabitToggle,

    reflection,
    reflectionLoading,
    showReflection,
    handleReflectionSave,
  } = useDashboardV2();

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
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">

        {/* Header */}
        <h1 className="text-vara-2xl font-semibold text-soft-charcoal">
          {greeting}, {userName}
        </h1>
        <p className="text-vara-sm text-muted-sage-gray mt-1">{formattedDate}</p>

        {/* V2 Card Stack */}
        <div className="flex flex-col gap-vara-base mt-vara-lg">

          {/* 1. Brain State Check-In */}
          <BrainStateCheckin
            currentCheckIn={brainStateCheckIn}
            onSelect={handleBrainStateSelect}
            loading={brainStateLoading}
          />

          {/* 2. Today's Protocol (only after check-in) */}
          {brainStateCheckIn && (
            <TodaysProtocolCard
              brainState={brainStateCheckIn.brainState}
              protocolCompleted={brainStateCheckIn.protocolCompleted}
              onComplete={handleProtocolComplete}
            />
          )}

          {/* 3. Daily Reflection (only after all habits done) */}
          {(showReflection || reflection) && (
            <DailyReflectionCard
              reflection={reflection}
              onSave={handleReflectionSave}
              loading={reflectionLoading}
            />
          )}

          {/* 4. Weekly Habits Tracker */}
          <WeeklyHabitsTracker
            habits={habits}
            completions={habitCompletions}
            onToggle={handleHabitToggle}
          />

        </div>
      </div>
    </SidebarLayout>
  );
}
