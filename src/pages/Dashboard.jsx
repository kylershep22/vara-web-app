// src/pages/Dashboard.jsx
// Thin UI shell — state lives in useDashboard hook.

import React from 'react';
import {
  Flame,
  CheckCircle,
  TrendingUp,
  Brain,
  Target,
  Plus,
  Edit2,
  Zap,
  CalendarClock,
  Inbox,
  Archive,
  BookOpen,
  Timer,
  Sparkles,
} from 'lucide-react';

import SidebarLayout from '../components/layout/SidebarLayout';
import StatCard from '../components/dashboard/StatCard';
import SectionCard from '../components/dashboard/SectionCard';
import TaskQuickAdd from '../components/tasks/TaskQuickAdd';
import TaskCard from '../components/tasks/TaskCard';
import TaskSection from '../components/tasks/TaskSection';
import HabitTrackerWeekly from '../components/dashboard/HabitTrackerWeekly';
import CommunityHighlights from '../components/dashboard/CommunityHighlights';
import HabitEditModal from '../components/dashboard/HabitEditModal';
import GoalEditModal from '../components/dashboard/GoalEditModal';
import GoalProgressModal from '../components/dashboard/GoalProgressModal';
import GoalCreateModal from '../components/dashboard/GoalCreateModal';

import { useDashboard, getGoalProgressParts } from '../hooks/useDashboard';

export default function Dashboard() {
  const {
    user,
    navigate,
    userName,
    activeGoals,
    habits,
    habitCompletions,
    loading,
    currentStreak,
    todaysCompletions,
    habitsDueToday,
    todayCompletionRate,
    weekCompletionRate,
    tasksByQuadrant,
    dailyPlan,
    isLoadingPlan,
    fetchDailyPlan,
    greeting,
    formattedDate,
    collapsedSections,
    toggleSection,
    editingHabit,
    setEditingHabit,
    editingGoal,
    setEditingGoal,
    progressGoal,
    setProgressGoal,
    showCreateGoalModal,
    setShowCreateGoalModal,
    handleCompleteHabit,
    handleToggleTask,
    handleAddTask,
    handleDeleteTask,
    handleDeferTask,
    getLinkedGoal,
    fetchDashboardData,
  } = useDashboard();

  if (loading) {
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
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg space-y-vara-base">

        {/* ==================== HEADER ==================== */}
        <div className="mb-vara-sm">
          <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-vara-sm text-muted-sage-gray mt-vara-2xs">{formattedDate}</p>
        </div>

        {/* ==================== HERO STATS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-vara-base">
          <StatCard
            icon={<Flame size={22} />}
            label="Current Streak"
            value={currentStreak}
            unit="days"
          />
          <StatCard
            icon={<CheckCircle size={22} />}
            label="Today's Habits"
            value={`${todaysCompletions.size}/${habitsDueToday.length}`}
            subtitle={`${todayCompletionRate}% complete`}
          />
          <StatCard
            icon={<TrendingUp size={22} />}
            label="This Week"
            value={`${weekCompletionRate}%`}
            subtitle="completion rate"
          />
        </div>

        {/* ==================== QUICK ACTIONS ==================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-vara-sm">
          <QuickActionButton icon={<BookOpen size={18} />} label="Journal" onClick={() => navigate('/journal')} />
          <QuickActionButton icon={<Timer size={18} />} label="Focus" onClick={() => navigate('/focus')} />
          <QuickActionButton icon={<Target size={18} />} label="Goals" onClick={() => navigate('/goals-habits')} />
          <QuickActionButton icon={<Sparkles size={18} />} label="AI Plan" onClick={fetchDailyPlan} />
        </div>

        {/* ==================== HABIT TRACKER ==================== */}
        <SectionCard
          title="Habit Tracker"
          icon={<Flame size={20} />}
          collapsible
          isCollapsed={collapsedSections.habits}
          onToggleCollapse={() => toggleSection('habits')}
          count={`${habits.filter((h) => h.active !== false).length} active`}
          action={
            <span className="text-vara-xs text-muted-sage-gray">
              {todaysCompletions.size}/{habitsDueToday.length} completed today
            </span>
          }
        >
          <HabitTrackerWeekly
            habits={habits}
            habitCompletions={habitCompletions}
            onComplete={handleCompleteHabit}
            onEdit={(habit) => setEditingHabit(habit)}
          />
        </SectionCard>

        {/* ==================== AI DAILY PLAN ==================== */}
        <SectionCard
          icon={<Brain size={20} />}
          title="AI Daily Plan"
          collapsible
          isCollapsed={collapsedSections.aiPlan}
          onToggleCollapse={() => toggleSection('aiPlan')}
          count={dailyPlan ? 'Generated' : 'Not generated'}
          action={
            <button
              onClick={fetchDailyPlan}
              disabled={isLoadingPlan}
              className="px-3 py-1.5 rounded-vara-md border border-divider hover:bg-dew-sage-light text-vara-sm font-medium text-evergreen-teal transition-colors disabled:opacity-50"
            >
              {isLoadingPlan ? '...' : 'Generate'}
            </button>
          }
        >
          {isLoadingPlan ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-evergreen-teal border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : dailyPlan ? (
            <div className="bg-teal-light rounded-vara-md p-vara-base">
              <p className="text-vara-base text-soft-charcoal leading-relaxed whitespace-pre-wrap break-words">
                {dailyPlan}
              </p>
            </div>
          ) : (
            <p className="text-muted-sage-gray text-center py-4 text-vara-sm">
              Click 'Generate' to get your personalized plan...
            </p>
          )}
        </SectionCard>

        {/* ==================== ACTIVE GOALS ==================== */}
        <SectionCard
          icon={<Target size={20} />}
          title="Active Goals"
          collapsible
          isCollapsed={collapsedSections.goals}
          onToggleCollapse={() => toggleSection('goals')}
          count={`${activeGoals.length} active`}
          action={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateGoalModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={16} />
                Create
              </button>
              <button
                onClick={() => navigate('/goals-habits')}
                className="text-vara-sm text-evergreen-teal hover:underline font-medium"
              >
                View All
              </button>
            </div>
          }
        >
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const { pct, progressDisplay, targetDisplay } = getGoalProgressParts(goal);
                return (
                  <div key={goal.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => setEditingGoal(goal)}
                          className="font-medium text-soft-charcoal hover:text-evergreen-teal text-left transition-colors truncate text-vara-sm"
                        >
                          {goal.title}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setProgressGoal(goal); }}
                            className="p-1 hover:bg-teal-light rounded-vara-sm transition-colors"
                            title="Mark progress"
                          >
                            <Plus size={14} className="text-evergreen-teal" />
                          </button>
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="p-1 hover:bg-dew-sage-light rounded-vara-sm transition-colors"
                            title="Edit goal"
                          >
                            <Edit2 size={14} className="text-muted-sage-gray" />
                          </button>
                        </div>
                      </div>
                      <span className="text-vara-sm font-semibold text-evergreen-teal flex-shrink-0">
                        {Math.round(pct)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-dew-sage-light rounded-vara-pill overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-evergreen-teal rounded-vara-pill transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-vara-xs text-muted-sage-gray">
                        {progressDisplay} / {targetDisplay} {goal.unit || 'completed'}
                      </span>
                      {goal.primaryFocus && (
                        <span className="text-vara-xs text-muted-sage-gray">{goal.primaryFocus}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-sage-gray mb-4 text-vara-sm">No active goals yet</p>
              <button
                onClick={() => setShowCreateGoalModal(true)}
                className="px-4 py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90 transition-opacity text-vara-sm font-medium"
              >
                Create Your First Goal
              </button>
            </div>
          )}
        </SectionCard>

        {/* ==================== TASK COMMAND CENTER ==================== */}
        <SectionCard
          title="Tasks"
          icon={<Target size={20} />}
          collapsible
          isCollapsed={collapsedSections.tasks}
          onToggleCollapse={() => toggleSection('tasks')}
          count={`${tasksByQuadrant.totalActive} active`}
          action={
            <button
              onClick={() => navigate('/goals-habits')}
              className="text-vara-sm text-evergreen-teal hover:underline font-medium"
            >
              Manage Tasks
            </button>
          }
        >
          <div className="mb-4">
            <TaskQuickAdd onAdd={handleAddTask} defaultQuadrant="urgent-important" />
          </div>

          <div className="space-y-3">
            <TaskSection title="DO FIRST" icon={Zap} count={tasksByQuadrant.urgentImportant.length} gradient="from-red-500 to-orange-500" borderColor="border-soft-coral/30" defaultExpanded>
              {tasksByQuadrant.urgentImportant.map((task) => (
                <TaskCard key={task.id} task={task} goalBadge={getLinkedGoal(task.goalId)?.title} onToggle={handleToggleTask} onEdit={() => navigate('/goals-habits')} onDelete={handleDeleteTask} onDefer={handleDeferTask} />
              ))}
            </TaskSection>

            <TaskSection title="SCHEDULE" icon={CalendarClock} count={tasksByQuadrant.importantNotUrgent.length} gradient="from-blue-500 to-indigo-500" borderColor="border-silver-sage" defaultExpanded={tasksByQuadrant.importantNotUrgent.length > 0}>
              {tasksByQuadrant.importantNotUrgent.map((task) => (
                <TaskCard key={task.id} task={task} goalBadge={getLinkedGoal(task.goalId)?.title} onToggle={handleToggleTask} onEdit={() => navigate('/goals-habits')} onDelete={handleDeleteTask} onDefer={handleDeferTask} />
              ))}
            </TaskSection>

            <TaskSection title="DELEGATE" icon={Inbox} count={tasksByQuadrant.urgentNotImportant.length} gradient="from-yellow-500 to-amber-500" borderColor="border-golden-apricot/30" defaultExpanded={false} autoCollapseIfEmpty>
              {tasksByQuadrant.urgentNotImportant.map((task) => (
                <TaskCard key={task.id} task={task} goalBadge={getLinkedGoal(task.goalId)?.title} onToggle={handleToggleTask} onEdit={() => navigate('/goals-habits')} onDelete={handleDeleteTask} onDefer={handleDeferTask} />
              ))}
            </TaskSection>

            <TaskSection title="ELIMINATE" icon={Archive} count={tasksByQuadrant.neither.length} gradient="from-muted-sage-gray to-soft-charcoal" borderColor="border-divider" defaultExpanded={false} autoCollapseIfEmpty>
              {tasksByQuadrant.neither.map((task) => (
                <TaskCard key={task.id} task={task} goalBadge={getLinkedGoal(task.goalId)?.title} onToggle={handleToggleTask} onEdit={() => navigate('/goals-habits')} onDelete={handleDeleteTask} onDefer={handleDeferTask} />
              ))}
            </TaskSection>
          </div>

          {tasksByQuadrant.totalActive === 0 && (
            <div className="text-center py-8">
              <Target className="mx-auto mb-3 text-silver-sage" size={40} />
              <p className="text-vara-sm font-medium text-soft-charcoal mb-1">No active tasks</p>
              <p className="text-vara-xs text-muted-sage-gray">Use Quick Add above to create your first task</p>
            </div>
          )}
        </SectionCard>

        {/* ==================== COMMUNITY HIGHLIGHTS ==================== */}
        <SectionCard
          title="Community Highlights"
          collapsible
          isCollapsed={collapsedSections.community}
          onToggleCollapse={() => toggleSection('community')}
          action={
            <button
              onClick={() => navigate('/community')}
              className="text-vara-sm text-evergreen-teal hover:underline font-medium"
            >
              View Community
            </button>
          }
        >
          <CommunityHighlights />
        </SectionCard>
      </div>

      {/* ==================== MODALS ==================== */}
      {editingHabit && (
        <HabitEditModal habit={editingHabit} onClose={() => setEditingHabit(null)} onSave={fetchDashboardData} />
      )}
      {editingGoal && (
        <GoalEditModal goal={editingGoal} onClose={() => setEditingGoal(null)} onSave={fetchDashboardData} />
      )}
      {progressGoal && (
        <GoalProgressModal goal={progressGoal} onClose={() => setProgressGoal(null)} onSave={fetchDashboardData} />
      )}
      {showCreateGoalModal && (
        <GoalCreateModal userId={user?.uid} onClose={() => setShowCreateGoalModal(false)} onSave={fetchDashboardData} />
      )}
    </SidebarLayout>
  );
}

/* ==================== QUICK ACTION BUTTON ==================== */

function QuickActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-vara-base py-3 bg-white border border-divider rounded-vara-lg hover:bg-teal-light hover:border-teal-medium text-soft-charcoal hover:text-evergreen-teal transition-all text-vara-sm font-medium shadow-vara-sm"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
