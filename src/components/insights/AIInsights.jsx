// src/components/insights/AIInsights.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Brain, TrendingUp, AlertCircle, Lightbulb, Sparkles, Loader } from 'lucide-react';

const AIInsights = ({ userId }) => {
  const [insights, setInsights] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (userId) {
      analyzeUserData();
    }
  }, [userId]);

  const analyzeUserData = async () => {
    setLoading(true);
    try {
      // Fetch user data from different collections
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Fetch habits
      const habitsSnapshot = await getDocs(
        query(collection(db, 'habits'), where('userId', '==', userId))
      );
      const habits = habitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch goals
      const goalsSnapshot = await getDocs(
        query(collection(db, 'goals'), where('userId', '==', userId))
      );
      const goals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch focus sessions
      const focusSnapshot = await getDocs(
        query(
          collection(db, 'focusSessions'),
          where('userId', '==', userId),
          where('startedAt', '>=', thirtyDaysAgo),
          orderBy('startedAt', 'desc')
        )
      );
      const focusSessions = focusSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch sleep logs
      const sleepSnapshot = await getDocs(
        query(
          collection(db, 'sleepLogs'),
          where('userId', '==', userId),
          where('date', '>=', thirtyDaysAgo),
          orderBy('date', 'desc')
        )
      );
      const sleepLogs = sleepSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Run pattern detection
      detectPatterns(habits, goals, focusSessions, sleepLogs);
    } catch (error) {
      console.error('Error analyzing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectPatterns = (habits, goals, focusSessions, sleepLogs) => {
    const detectedPatterns = [];
    const detectedInsights = [];
    const detectedRecommendations = [];

    // Pattern 1: Habit completion vs sleep quality correlation
    if (habits.length > 0 && sleepLogs.length > 5) {
      const avgSleep = sleepLogs.reduce((sum, log) => sum + log.hoursSlept, 0) / sleepLogs.length;
      if (avgSleep < 7) {
        detectedPatterns.push({
          id: 'sleep-habits',
          title: 'Sleep-Performance Link',
          description: `Your average sleep is ${avgSleep.toFixed(1)}h. This may be impacting habit completion and focus.`,
          type: 'correlation',
          severity: 'high'
        });

        detectedRecommendations.push({
          id: 'rec-sleep',
          title: 'Prioritize Sleep',
          description: 'Aim for 7.5-8 hours per night for 2 weeks and track the impact on your habits and focus sessions.',
          actionable: true
        });
      }
    }

    // Pattern 2: Focus session productivity by time of day
    if (focusSessions.length > 5) {
      const hourCounts = {};
      focusSessions.forEach(session => {
        const hour = session.startedAt?.toDate().getHours();
        if (hour) {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });

      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      if (peakHour) {
        const hourNum = parseInt(peakHour[0]);
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;

        detectedInsights.push({
          id: 'peak-hour',
          title: 'Peak Productivity Window',
          description: `You focus most often around ${displayHour}${period}. This appears to be your natural productivity peak.`,
          type: 'strength',
          icon: 'trending-up'
        });

        detectedRecommendations.push({
          id: 'rec-schedule',
          title: 'Optimize Your Schedule',
          description: `Block your most important work for ${displayHour}${period} when you naturally focus best.`,
          actionable: true
        });
      }
    }

    // Pattern 3: Goal completion rate analysis
    const activeGoals = goals.filter(g => g.status !== 'completed');
    const completedGoals = goals.filter(g => g.status === 'completed');

    if (goals.length > 0) {
      const completionRate = (completedGoals.length / goals.length) * 100;

      if (activeGoals.length > 5) {
        detectedPatterns.push({
          id: 'too-many-goals',
          title: 'Goal Overload',
          description: `You have ${activeGoals.length} active goals. Research shows focusing on 1-3 goals at a time leads to better completion rates.`,
          type: 'warning',
          severity: 'medium'
        });

        detectedRecommendations.push({
          id: 'rec-focus-goals',
          title: 'Narrow Your Focus',
          description: 'Pick your top 3 goals and pause the rest. You can always come back to them later.',
          actionable: true
        });
      }

      if (completionRate > 0 && completionRate < 40) {
        detectedInsights.push({
          id: 'goal-completion',
          title: 'Goal Completion Opportunity',
          description: `Your completion rate is ${Math.round(completionRate)}%. Consider breaking goals into smaller milestones or adjusting timeframes.`,
          type: 'opportunity',
          icon: 'target'
        });
      }
    }

    // Pattern 4: Habit streak analysis
    const habitsWithStreaks = habits.filter(h => h.streak > 7);
    if (habitsWithStreaks.length > 0) {
      detectedInsights.push({
        id: 'strong-streaks',
        title: 'Strong Habit Foundation',
        description: `You have ${habitsWithStreaks.length} habits with 7+ day streaks. These consistent behaviors are building compound benefits.`,
        type: 'strength',
        icon: 'award'
      });
    }

    // Pattern 5: Focus session completion rate
    if (focusSessions.length > 5) {
      const completedSessions = focusSessions.filter(s => s.completed).length;
      const completionRate = (completedSessions / focusSessions.length) * 100;

      if (completionRate < 70) {
        detectedPatterns.push({
          id: 'focus-completion',
          title: 'Session Completion Rate Low',
          description: `${Math.round(completionRate)}% of focus sessions are completed. You may be setting durations that are too long.`,
          type: 'warning',
          severity: 'medium'
        });

        detectedRecommendations.push({
          id: 'rec-shorter-sessions',
          title: 'Try Shorter Sessions',
          description: 'Start with 25-minute Pomodoros instead of longer sessions to build completion momentum.',
          actionable: true
        });
      }
    }

    // Pattern 6: Sleep quality trends
    if (sleepLogs.length > 7) {
      const poorSleepDays = sleepLogs.filter(log => log.quality === 'poor' || log.quality === 'fair').length;
      const poorSleepRate = (poorSleepDays / sleepLogs.length) * 100;

      if (poorSleepRate > 40) {
        detectedPatterns.push({
          id: 'sleep-quality',
          title: 'Sleep Quality Needs Attention',
          description: `${Math.round(poorSleepRate)}% of your nights are fair or poor quality. This impacts cognitive performance and stress resilience.`,
          type: 'warning',
          severity: 'high'
        });

        detectedRecommendations.push({
          id: 'rec-sleep-routine',
          title: 'Build a Bedtime Routine',
          description: 'Create a consistent bedtime routine in the Fuel & Recovery section to improve sleep quality.',
          actionable: true
        });
      }
    }

    // Set state
    setPatterns(detectedPatterns);
    setInsights(detectedInsights);
    setRecommendations(detectedRecommendations);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'low': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'strength': return TrendingUp;
      case 'opportunity': return Lightbulb;
      case 'warning': return AlertCircle;
      default: return Brain;
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="text-purple-600" size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-purple-900 mb-2">AI-Powered Insights</h2>
            <p className="text-purple-700">
              Our AI analyzes your habits, goals, focus sessions, and sleep patterns to detect trends and provide personalized recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Patterns Detected */}
      {patterns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Patterns Detected</h3>
          </div>

          <div className="space-y-3">
            {patterns.map(pattern => (
              <div
                key={pattern.id}
                className={`p-4 rounded-lg border-2 border-l-4 bg-gradient-to-r ${getSeverityColor(pattern.severity)} bg-opacity-10`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-orange-600 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{pattern.title}</h4>
                    <p className="text-sm text-gray-700">{pattern.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
          </div>

          <div className="space-y-3">
            {insights.map(insight => {
              const Icon = getTypeIcon(insight.type);

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${
                    insight.type === 'strength' ? 'border-green-200 bg-green-50' :
                    insight.type === 'opportunity' ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={
                      insight.type === 'strength' ? 'text-green-600' :
                      insight.type === 'opportunity' ? 'text-blue-600' :
                      'text-gray-600'
                    } size={20} />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-700">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-yellow-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Personalized Recommendations</h3>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={rec.id} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-900 text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-700">{rec.description}</p>
                  </div>
                  {rec.actionable && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      Actionable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {patterns.length === 0 && insights.length === 0 && recommendations.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Brain className="mx-auto mb-3 text-gray-300" size={64} />
          <h3 className="font-semibold text-gray-700 mb-2">Not Enough Data Yet</h3>
          <p className="text-gray-500 mb-4">
            Keep tracking your habits, goals, focus sessions, and sleep for a week. We'll analyze your patterns and provide personalized insights.
          </p>
        </div>
      )}

      {/* How AI Insights Work */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="font-semibold text-indigo-900 mb-3">How AI Insights Work</h3>
        <div className="space-y-2 text-sm text-indigo-700">
          <p>
            • <strong>Pattern Detection:</strong> We analyze your activity across habits, goals, focus, and sleep to identify correlations and trends.
          </p>
          <p>
            • <strong>Personalized Analysis:</strong> Insights are tailored to YOUR data, not generic advice.
          </p>
          <p>
            • <strong>Actionable Recommendations:</strong> Every recommendation includes a specific next step you can take.
          </p>
          <p>
            • <strong>Privacy First:</strong> All analysis happens on your data only. Your patterns stay private.
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-1">Coming Soon: Advanced AI Features</h3>
        <p className="text-sm text-blue-700">
          Predictive insights, habit recommendations based on your goals, optimal routine suggestions, and correlation analysis between all your tracked metrics.
        </p>
      </div>
    </div>
  );
};

export default AIInsights;
