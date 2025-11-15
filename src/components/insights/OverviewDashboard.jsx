// src/components/insights/OverviewDashboard.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { TrendingUp, Target, Zap, Moon, CheckCircle, Award, Calendar, Clock } from 'lucide-react';

const OverviewDashboard = ({ userId }) => {
  const [stats, setStats] = useState({
    habitsToday: 0,
    totalHabits: 0,
    habitCompletionRate: 0,
    activeGoals: 0,
    completedGoals: 0,
    focusMinutesThisWeek: 0,
    avgSleepThisWeek: 0,
    currentStreak: 0
  });
  const [recentWins, setRecentWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchOverviewData();
    }
  }, [userId]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(now.getDate() - 7);

      // Fetch habits data
      const habitsQuery = query(
        collection(db, 'habits'),
        where('userId', '==', userId),
        where('active', '==', true)
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      const totalHabits = habitsSnapshot.size;

      // Count completed habits today
      let habitsCompletedToday = 0;
      let longestStreak = 0;

      for (const habitDoc of habitsSnapshot.docs) {
        const habitData = habitDoc.data();

        // Check today's completion
        const completionsQuery = query(
          collection(db, `habits/${habitDoc.id}/completions`),
          where('date', '>=', todayStart)
        );
        const completionsSnapshot = await getDocs(completionsQuery);
        if (!completionsSnapshot.empty) {
          habitsCompletedToday++;
        }

        // Track longest streak
        if (habitData.streak && habitData.streak > longestStreak) {
          longestStreak = habitData.streak;
        }
      }

      const completionRate = totalHabits > 0 ? Math.round((habitsCompletedToday / totalHabits) * 100) : 0;

      // Fetch goals data
      const goalsQuery = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
      );
      const goalsSnapshot = await getDocs(goalsQuery);
      const activeGoals = goalsSnapshot.docs.filter(doc => doc.data().status !== 'completed').length;
      const completedGoals = goalsSnapshot.docs.filter(doc => doc.data().status === 'completed').length;

      // Fetch focus sessions this week
      const focusQuery = query(
        collection(db, 'focusSessions'),
        where('userId', '==', userId),
        where('startedAt', '>=', weekStart)
      );
      const focusSnapshot = await getDocs(focusQuery);
      const focusMinutesThisWeek = focusSnapshot.docs.reduce((sum, doc) => sum + (doc.data().duration || 0), 0);

      // Fetch sleep logs this week
      const sleepQuery = query(
        collection(db, 'sleepLogs'),
        where('userId', '==', userId),
        where('date', '>=', weekStart)
      );
      const sleepSnapshot = await getDocs(sleepQuery);
      const avgSleepThisWeek = sleepSnapshot.size > 0
        ? (sleepSnapshot.docs.reduce((sum, doc) => sum + (doc.data().hoursSlept || 0), 0) / sleepSnapshot.size).toFixed(1)
        : 0;

      // Fetch recent wins (public posts)
      const winsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('isPublicWin', '==', true),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const winsSnapshot = await getDocs(winsQuery);
      const wins = winsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setStats({
        habitsToday: habitsCompletedToday,
        totalHabits,
        habitCompletionRate: completionRate,
        activeGoals,
        completedGoals,
        focusMinutesThisWeek,
        avgSleepThisWeek,
        currentStreak: longestStreak
      });

      setRecentWins(wins);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Habit Completion */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="text-green-600" size={28} />
            <div className="text-3xl font-bold text-green-900">{stats.habitCompletionRate}%</div>
          </div>
          <div className="text-sm font-semibold text-green-700 uppercase mb-1">Today's Habits</div>
          <div className="text-xs text-green-600">{stats.habitsToday} of {stats.totalHabits} completed</div>
        </div>

        {/* Active Goals */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <Target className="text-blue-600" size={28} />
            <div className="text-3xl font-bold text-blue-900">{stats.activeGoals}</div>
          </div>
          <div className="text-sm font-semibold text-blue-700 uppercase mb-1">Active Goals</div>
          <div className="text-xs text-blue-600">{stats.completedGoals} completed</div>
        </div>

        {/* Focus Time */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <Zap className="text-purple-600" size={28} />
            <div className="text-3xl font-bold text-purple-900">{formatDuration(stats.focusMinutesThisWeek)}</div>
          </div>
          <div className="text-sm font-semibold text-purple-700 uppercase mb-1">Focus This Week</div>
          <div className="text-xs text-purple-600">Deep work sessions</div>
        </div>

        {/* Sleep Average */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <Moon className="text-indigo-600" size={28} />
            <div className="text-3xl font-bold text-indigo-900">{stats.avgSleepThisWeek}h</div>
          </div>
          <div className="text-sm font-semibold text-indigo-700 uppercase mb-1">Avg Sleep</div>
          <div className="text-xs text-indigo-600">Last 7 days</div>
        </div>
      </div>

      {/* Current Streak */}
      {stats.currentStreak > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Award className="text-orange-600" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-orange-900">{stats.currentStreak} Day Streak</h3>
              <p className="text-orange-700">Your longest habit streak. Keep it going!</p>
            </div>
          </div>
        </div>
      )}

      {/* This Week Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">This Week at a Glance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.habitsToday}/{stats.totalHabits}</div>
            <div className="text-sm text-gray-600">Habits completed today</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{formatDuration(stats.focusMinutesThisWeek)}</div>
            <div className="text-sm text-gray-600">Deep focus time</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.avgSleepThisWeek}h</div>
            <div className="text-sm text-gray-600">Average sleep</div>
          </div>
        </div>
      </div>

      {/* Recent Wins */}
      {recentWins.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-yellow-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Recent Wins</h3>
          </div>

          <div className="space-y-3">
            {recentWins.map(win => (
              <div
                key={win.id}
                className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="text-yellow-600" size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{win.content}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(win.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-4">What would you like to explore?</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Habits', icon: TrendingUp },
            { label: 'Goals', icon: Target },
            { label: 'Focus', icon: Zap },
            { label: 'Sleep', icon: Moon },
            { label: 'AI Insights', icon: Clock }
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                className="p-4 bg-white/20 hover:bg-white/30 rounded-lg transition text-center"
              >
                <Icon className="mx-auto mb-2" size={24} />
                <div className="text-sm font-medium">{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
