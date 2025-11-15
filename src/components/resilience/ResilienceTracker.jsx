// src/components/resilience/ResilienceTracker.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { TrendingUp, Award, Calendar, Heart, Brain, Smile, Sparkles, Target } from 'lucide-react';

const ResilienceTracker = ({ userId }) => {
  const [resilienceData, setResilienceData] = useState({
    gratitudeStreak: 0,
    totalGratitudeEntries: 0,
    emotionalCheckins: 0,
    cognitiveReframes: 0,
    mindfulnessMinutes: 0,
    overallScore: 0
  });
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchResilienceData();
    }
  }, [userId]);

  const fetchResilienceData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Fetch gratitude entries
      const gratitudeQuery = query(
        collection(db, 'gratitudeEntries'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const gratitudeSnapshot = await getDocs(gratitudeQuery);
      const gratitudeEntries = gratitudeSnapshot.docs.map(doc => doc.data());

      // Calculate gratitude streak
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStrings = new Set(
        gratitudeEntries.map(e => {
          const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      );
      let checkDate = new Date(today);
      while (dateStrings.has(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Fetch emotional check-ins
      const checkinsQuery = query(
        collection(db, 'emotionalCheckins'),
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgo)
      );
      const checkinsSnapshot = await getDocs(checkinsQuery);

      // Fetch cognitive reframes
      const reframesQuery = query(
        collection(db, 'cognitiveReframes'),
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgo)
      );
      const reframesSnapshot = await getDocs(reframesQuery);

      // Calculate overall resilience score (0-100)
      const gratitudeScore = Math.min(30, streak * 3); // Max 30 points for 10+ day streak
      const emotionalScore = Math.min(25, checkinsSnapshot.size * 2); // Max 25 points for 12+ check-ins
      const reframeScore = Math.min(25, reframesSnapshot.size * 5); // Max 25 points for 5+ reframes
      const consistencyScore = 20; // Base points for showing up
      const overallScore = Math.round(gratitudeScore + emotionalScore + reframeScore + consistencyScore);

      setResilienceData({
        gratitudeStreak: streak,
        totalGratitudeEntries: gratitudeEntries.length,
        emotionalCheckins: checkinsSnapshot.size,
        cognitiveReframes: reframesSnapshot.size,
        mindfulnessMinutes: 0, // Would need to track from mindfulness exercises
        overallScore: Math.min(100, overallScore)
      });

      // Generate weekly activity heatmap
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayTimestamp = date.getTime();

        const gratitudeCount = gratitudeEntries.filter(e => {
          const entryDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === dayTimestamp;
        }).length;

        const checkinsCount = checkinsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const checkinDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          checkinDate.setHours(0, 0, 0, 0);
          return checkinDate.getTime() === dayTimestamp;
        }).length;

        const reframesCount = reframesSnapshot.docs.filter(doc => {
          const data = doc.data();
          const reframeDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          reframeDate.setHours(0, 0, 0, 0);
          return reframeDate.getTime() === dayTimestamp;
        }).length;

        weeklyData.push({
          date: date,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          gratitude: gratitudeCount,
          checkins: checkinsCount,
          reframes: reframesCount,
          totalActivities: gratitudeCount + checkinsCount + reframesCount
        });
      }

      setWeeklyActivity(weeklyData);
    } catch (error) {
      console.error('Error fetching resilience data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getActivityColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    return 'bg-green-600';
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
      {/* Resilience Score */}
      <div className={`bg-gradient-to-br ${getScoreColor(resilienceData.overallScore)} rounded-xl shadow-lg p-8 text-white`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-white/20 rounded-lg">
            <Award className="text-white" size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Resilience Score: {resilienceData.overallScore}/100</h2>
            <p className="text-white/90">
              {resilienceData.overallScore >= 80 && 'Exceptional! You\'re building strong mental resilience.'}
              {resilienceData.overallScore >= 60 && resilienceData.overallScore < 80 && 'Great work! Keep up these practices.'}
              {resilienceData.overallScore >= 40 && resilienceData.overallScore < 60 && 'You\'re on the right track. Stay consistent!'}
              {resilienceData.overallScore < 40 && 'Start small. Even one practice daily builds momentum.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{resilienceData.gratitudeStreak}</div>
            <div className="text-sm text-white/80">Day Gratitude Streak</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{resilienceData.emotionalCheckins}</div>
            <div className="text-sm text-white/80">Emotional Check-Ins</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{resilienceData.cognitiveReframes}</div>
            <div className="text-sm text-white/80">Thought Reframes</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{resilienceData.totalGratitudeEntries}</div>
            <div className="text-sm text-white/80">Total Gratitude</div>
          </div>
        </div>
      </div>

      {/* Weekly Activity Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Weekly Resilience Activity</h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeklyActivity.map((day, idx) => (
            <div key={idx} className="text-center">
              <div className="text-xs text-gray-500 mb-2">{day.dayName}</div>
              <div
                className={`w-full aspect-square rounded-lg ${getActivityColor(day.totalActivities)} border border-gray-200 flex items-center justify-center font-bold text-gray-700`}
                title={`${day.totalActivities} activities`}
              >
                {day.totalActivities > 0 ? day.totalActivities : ''}
              </div>
              <div className="mt-2 space-y-0.5">
                {day.gratitude > 0 && (
                  <div className="w-full h-1 bg-pink-400 rounded" title="Gratitude"></div>
                )}
                {day.checkins > 0 && (
                  <div className="w-full h-1 bg-blue-400 rounded" title="Emotional Check-in"></div>
                )}
                {day.reframes > 0 && (
                  <div className="w-full h-1 bg-purple-400 rounded" title="Thought Reframe"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-pink-400 rounded"></div>
            <span>Gratitude</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span>Check-in</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-400 rounded"></div>
            <span>Reframe</span>
          </div>
        </div>
      </div>

      {/* Practice Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gratitude */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="text-pink-600" size={28} />
            <h4 className="font-semibold text-pink-900">Gratitude Practice</h4>
          </div>
          <div className="space-y-2 text-sm text-pink-700">
            <div className="flex items-center justify-between">
              <span>Current Streak:</span>
              <span className="font-bold">{resilienceData.gratitudeStreak} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Entries:</span>
              <span className="font-bold">{resilienceData.totalGratitudeEntries}</span>
            </div>
          </div>
        </div>

        {/* Emotional Awareness */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Smile className="text-blue-600" size={28} />
            <h4 className="font-semibold text-blue-900">Emotional Awareness</h4>
          </div>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-center justify-between">
              <span>Check-ins (30d):</span>
              <span className="font-bold">{resilienceData.emotionalCheckins}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg per week:</span>
              <span className="font-bold">{Math.round((resilienceData.emotionalCheckins / 30) * 7)}</span>
            </div>
          </div>
        </div>

        {/* Cognitive Reframing */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-purple-600" size={28} />
            <h4 className="font-semibold text-purple-900">Thought Reframing</h4>
          </div>
          <div className="space-y-2 text-sm text-purple-700">
            <div className="flex items-center justify-between">
              <span>Reframes (30d):</span>
              <span className="font-bold">{resilienceData.cognitiveReframes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg per week:</span>
              <span className="font-bold">{Math.round((resilienceData.cognitiveReframes / 30) * 7)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-indigo-600" size={20} />
          <h3 className="font-semibold text-indigo-900">Resilience Insights</h3>
        </div>

        <div className="space-y-3 text-sm text-indigo-700">
          {resilienceData.gratitudeStreak === 0 && (
            <div className="flex items-start gap-2">
              <Target className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
              <p><strong>Get Started:</strong> Begin with daily gratitude practice. It's the easiest entry point for building resilience.</p>
            </div>
          )}

          {resilienceData.gratitudeStreak >= 7 && resilienceData.emotionalCheckins < 7 && (
            <div className="flex items-start gap-2">
              <Target className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
              <p><strong>Next Step:</strong> Add daily emotional check-ins to build awareness of your emotional patterns.</p>
            </div>
          )}

          {resilienceData.emotionalCheckins >= 10 && resilienceData.cognitiveReframes < 5 && (
            <div className="flex items-start gap-2">
              <Target className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
              <p><strong>Level Up:</strong> Try cognitive reframing when you notice unhelpful thoughts. This deepens emotional regulation.</p>
            </div>
          )}

          {resilienceData.overallScore >= 80 && (
            <div className="flex items-start gap-2">
              <Award className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
              <p><strong>Excellent Work!</strong> You're building powerful resilience habits. Keep the momentum going!</p>
            </div>
          )}

          <div className="flex items-start gap-2 border-t border-indigo-200 pt-3 mt-3">
            <TrendingUp className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
            <p><strong>Remember:</strong> Resilience isn't about never feeling stress or negative emotions. It's about bouncing back faster and with greater strength each time.</p>
          </div>
        </div>
      </div>

      {/* What is Resilience */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What is Mental Resilience?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold mb-2">Resilience is NOT:</h4>
            <ul className="space-y-1">
              <li>• Never experiencing stress or hardship</li>
              <li>• Always staying positive</li>
              <li>• Ignoring or suppressing difficult emotions</li>
              <li>• Being invulnerable to challenges</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Resilience IS:</h4>
            <ul className="space-y-1">
              <li>• Bouncing back from adversity</li>
              <li>• Processing emotions in healthy ways</li>
              <li>• Adapting to change and challenge</li>
              <li>• Growing stronger through difficulty</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResilienceTracker;
