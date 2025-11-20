// src/components/insights/HabitsAnalytics.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TrendingUp, Flame, Award, Calendar, CheckCircle, XCircle } from 'lucide-react';

const HabitsAnalytics = ({ userId }) => {
  const [habits, setHabits] = useState([]);
  const [habitStats, setHabitStats] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [timeRange, setTimeRange] = useState(30); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchHabitsAnalytics();
    }
  }, [userId, timeRange]);

  const fetchHabitsAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all active habits
      const habitsQuery = query(
        collection(db, 'habits'),
        where('userId', '==', userId),
        where('active', '==', true)
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      const habitsData = habitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log('Fetched habits:', habitsData);
      setHabits(habitsData);

      // Calculate stats for each habit
      const stats = [];
      const dailyCompletions = {};

      for (const habit of habitsData) {
        // Fetch completions from the habitCompletions collection (new pattern)
        const completionsQuery = query(
          collection(db, 'habitCompletions'),
          where('habitId', '==', habit.id)
        );
        const completionsSnapshot = await getDocs(completionsQuery);

        const completions = completionsSnapshot.docs.map(doc => {
          const data = doc.data();
          // Handle both dateISO string and createdAt timestamp
          let date;
          if (data.dateISO) {
            date = new Date(data.dateISO);
          } else if (data.createdAt?.toDate) {
            date = data.createdAt.toDate();
          } else if (data.date?.toDate) {
            date = data.date.toDate();
          } else {
            date = new Date();
          }

          return {
            id: doc.id,
            ...data,
            date
          };
        });

        console.log(`Completions for ${habit.name || habit.title}:`, completions.length);

        // Filter by time range
        const now = new Date();
        const rangeStart = new Date();
        rangeStart.setDate(now.getDate() - timeRange);

        const recentCompletions = completions.filter(c => c.date >= rangeStart);

        // Calculate completion rate
        const completionRate = timeRange > 0
          ? Math.round((recentCompletions.length / timeRange) * 100)
          : 0;

        // Track daily completions for heatmap
        recentCompletions.forEach(completion => {
          const dateKey = completion.date.toISOString().split('T')[0];
          if (!dailyCompletions[dateKey]) {
            dailyCompletions[dateKey] = 0;
          }
          dailyCompletions[dateKey]++;
        });

        stats.push({
          habitId: habit.id,
          habitName: habit.name || habit.title || 'Unnamed Habit',
          streak: habit.streak || 0,
          completionRate,
          totalCompletions: recentCompletions.length,
          type: habit.type
        });
      }

      // Sort by completion rate
      stats.sort((a, b) => b.completionRate - a.completionRate);

      console.log('Habit stats:', stats);
      setHabitStats(stats);

      // Generate weekly heatmap data
      const heatmapData = [];
      for (let i = timeRange - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const count = dailyCompletions[dateKey] || 0;

        heatmapData.push({
          date: date,
          dateKey,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count,
          percentage: habitsData.length > 0 ? Math.round((count / habitsData.length) * 100) : 0
        });
      }

      setWeeklyData(heatmapData);
    } catch (error) {
      console.error('Error fetching habits analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHeatmapColor = (percentage) => {
    if (percentage === 0) return 'bg-gray-100';
    if (percentage < 30) return 'bg-green-200';
    if (percentage < 60) return 'bg-green-400';
    if (percentage < 90) return 'bg-green-600';
    return 'bg-green-800';
  };

  const bestHabits = habitStats.slice(0, 3);
  const worstHabits = habitStats.slice(-3).reverse();

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
      {/* Time Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        {[7, 14, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeRange === days
                ? 'bg-[#1B5E57] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-xs font-medium text-green-700 uppercase">Active Habits</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{habits.length}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-orange-600" size={20} />
            <span className="text-xs font-medium text-orange-700 uppercase">Best Streak</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">
            {Math.max(...habitStats.map(h => h.streak), 0)} days
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600" size={20} />
            <span className="text-xs font-medium text-blue-700 uppercase">Avg Completion</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {habitStats.length > 0
              ? Math.round(habitStats.reduce((sum, h) => sum + h.completionRate, 0) / habitStats.length)
              : 0}%
          </div>
        </div>
      </div>

      {/* Completion Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Completion Heatmap</h3>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded ${getHeatmapColor(day.percentage)} border border-gray-200 flex items-center justify-center text-xs font-semibold ${
                    day.percentage > 60 ? 'text-white' : 'text-gray-700'
                  }`}
                  title={`${day.date.toLocaleDateString()}: ${day.count} habits (${day.percentage}%)`}
                >
                  {day.count}
                </div>
                <div className="text-xs text-gray-500 mt-1">{day.dayName}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 25, 50, 75, 100].map(pct => (
              <div key={pct} className={`w-4 h-4 rounded ${getHeatmapColor(pct)}`}></div>
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Best & Worst Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Habits */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-yellow-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          </div>

          {bestHabits.length > 0 ? (
            <div className="space-y-3">
              {bestHabits.map((habit, idx) => (
                <div key={habit.habitId} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-white text-sm">
                        #{idx + 1}
                      </div>
                      <span className="text-lg font-bold text-gray-900">{habit.habitName}</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">{habit.completionRate}%</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Flame size={14} className="text-orange-500" />
                      <span className="font-semibold">{habit.streak}</span>
                      <span className="text-gray-600">day streak</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">{habit.totalCompletions}</span>
                      <span className="text-gray-600"> completions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No habits tracked yet</p>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Needs Attention</h3>
          </div>

          {worstHabits.length > 0 ? (
            <div className="space-y-3">
              {worstHabits.map((habit) => (
                <div key={habit.habitId} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">{habit.habitName}</span>
                    <div className="text-2xl font-bold text-orange-700">{habit.completionRate}%</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Flame size={14} className="text-orange-500" />
                      <span className="font-semibold">{habit.streak}</span>
                      <span className="text-gray-600">day streak</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">{habit.totalCompletions}</span>
                      <span className="text-gray-600"> completions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">All habits performing well!</p>
          )}
        </div>
      </div>

      {/* All Habits Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Habits Breakdown</h3>

        {habitStats.length > 0 ? (
          <div className="space-y-3">
            {habitStats.map(habit => (
              <div key={habit.habitId} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                {/* Habit Name and Completion Rate */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">{habit.habitName}</span>
                    {habit.streak > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                        <Flame size={12} />
                        {habit.streak} days
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{habit.completionRate}%</div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      habit.completionRate >= 80 ? 'bg-green-600' :
                      habit.completionRate >= 60 ? 'bg-blue-600' :
                      habit.completionRate >= 40 ? 'bg-yellow-600' :
                      'bg-orange-600'
                    }`}
                    style={{ width: `${habit.completionRate}%` }}
                  ></div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-gray-700">
                    <span className="font-semibold">{habit.totalCompletions}</span>
                    <span className="text-gray-600"> completions</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <div className="text-gray-600">
                    Last {timeRange} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No habit data yet. Start tracking habits to see insights!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitsAnalytics;
