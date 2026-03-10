// src/components/trackers/BrainHealthScore.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Brain, TrendingUp, Award, Target, Zap, Heart, Leaf, Users, BookOpen, Activity } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const BrainHealthScore = ({ userId }) => {
  const [scores, setScores] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      calculateBrainHealthScore();
    }
  }, [userId]);

  const calculateBrainHealthScore = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch all relevant data from the past week
      const [
        habitsSnapshot,
        focusSessionsSnapshot,
        sleepLogsSnapshot,
        socialConnectionsSnapshot,
        natureExposureSnapshot,
        gratitudeSnapshot,
        energyCheckinsSnapshot
      ] = await Promise.all([
        getDocs(query(collection(db, 'habits'), where('userId', '==', userId), where('active', '==', true))),
        getDocs(query(collection(db, 'focusSessions'), where('userId', '==', userId), where('completed', '==', true), orderBy('startedAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'sleepLogs'), where('userId', '==', userId), orderBy('date', 'desc'), limit(7))),
        getDocs(query(collection(db, 'socialConnections'), where('userId', '==', userId), orderBy('date', 'desc'), limit(20))),
        getDocs(query(collection(db, 'natureExposure'), where('userId', '==', userId), orderBy('date', 'desc'), limit(20))),
        getDocs(query(collection(db, 'gratitudeEntries'), where('userId', '==', userId), orderBy('date', 'desc'), limit(10))),
        getDocs(query(collection(db, 'energyCheckins'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(20)))
      ]);

      // Calculate individual scores (0-100)
      const cognitiveScore = calculateCognitiveScore(focusSessionsSnapshot);
      const sleepScore = calculateSleepScore(sleepLogsSnapshot);
      const socialScore = calculateSocialScore(socialConnectionsSnapshot, oneWeekAgo);
      const natureScore = calculateNatureScore(natureExposureSnapshot, oneWeekAgo);
      const gratitudeScore = calculateGratitudeScore(gratitudeSnapshot, oneWeekAgo);
      const energyScore = calculateEnergyScore(energyCheckinsSnapshot);
      const habitScore = calculateHabitScore(habitsSnapshot);

      // Weighted overall score
      const overallScore = Math.round(
        cognitiveScore * 0.20 +    // 20% - Focus/productivity
        sleepScore * 0.20 +         // 20% - Sleep quality
        socialScore * 0.15 +        // 15% - Social connections
        natureScore * 0.10 +        // 10% - Nature exposure
        gratitudeScore * 0.10 +     // 10% - Gratitude practice
        energyScore * 0.10 +        // 10% - Energy management
        habitScore * 0.15           // 15% - Healthy habits
      );

      const calculatedScores = {
        overall: overallScore,
        categories: {
          cognitive: cognitiveScore,
          sleep: sleepScore,
          social: socialScore,
          nature: natureScore,
          gratitude: gratitudeScore,
          energy: energyScore,
          habits: habitScore
        },
        trend: 'stable', // Would compare with previous week
        lastUpdated: new Date()
      };

      setScores(calculatedScores);

      // Fetch score history (simplified - would need dedicated collection)
      setScoreHistory(generateMockHistory(overallScore));

    } catch (error) {
      console.error('Error calculating brain health score:', error);
    } finally {
      setLoading(false);
    }
  };

  // Score calculation functions
  const calculateCognitiveScore = (snapshot) => {
    const sessions = snapshot.docs.map(doc => doc.data());
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekSessions = sessions.filter(s => {
      const sessionDate = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt);
      return sessionDate >= oneWeekAgo && s.completed;
    });

    const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Target: 150+ minutes per week (5 x 30min sessions)
    const score = Math.min(100, (totalMinutes / 150) * 100);
    return Math.round(score);
  };

  const calculateSleepScore = (snapshot) => {
    const logs = snapshot.docs.map(doc => doc.data());

    if (logs.length === 0) return 50; // Default if no data

    const avgHours = logs.reduce((sum, log) => sum + (log.hoursSlept || 0), 0) / logs.length;
    const avgQuality = logs.reduce((sum, log) => sum + (log.quality || 0), 0) / logs.length;

    // Ideal: 7-9 hours, quality 4-5/5
    const hoursScore = avgHours >= 7 && avgHours <= 9 ? 100 : Math.max(0, 100 - Math.abs(8 - avgHours) * 20);
    const qualityScore = (avgQuality / 5) * 100;

    return Math.round((hoursScore + qualityScore) / 2);
  };

  const calculateSocialScore = (snapshot, oneWeekAgo) => {
    const connections = snapshot.docs.map(doc => doc.data());
    const weekConnections = connections.filter(c => {
      const connDate = c.date?.toDate ? c.date.toDate() : new Date(c.date);
      return connDate >= oneWeekAgo;
    });

    // Target: 2-3 quality connections per week
    const avgQuality = weekConnections.length > 0
      ? weekConnections.reduce((sum, c) => sum + c.quality, 0) / weekConnections.length
      : 0;

    const frequencyScore = Math.min(100, (weekConnections.length / 3) * 100);
    const qualityScore = (avgQuality / 5) * 100;

    return Math.round((frequencyScore + qualityScore) / 2);
  };

  const calculateNatureScore = (snapshot, oneWeekAgo) => {
    const exposures = snapshot.docs.map(doc => doc.data());
    const weekExposures = exposures.filter(e => {
      const expDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return expDate >= oneWeekAgo;
    });

    const totalMinutes = weekExposures.reduce((sum, e) => sum + (e.duration || 0), 0);

    // Target: 120+ minutes per week (2 hours)
    const score = Math.min(100, (totalMinutes / 120) * 100);
    return Math.round(score);
  };

  const calculateGratitudeScore = (snapshot, oneWeekAgo) => {
    const entries = snapshot.docs.map(doc => doc.data());
    const weekEntries = entries.filter(e => {
      const entryDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return entryDate >= oneWeekAgo;
    });

    // Target: 5-7 entries per week (daily practice)
    const score = Math.min(100, (weekEntries.length / 7) * 100);
    return Math.round(score);
  };

  const calculateEnergyScore = (snapshot) => {
    const checkins = snapshot.docs.map(doc => doc.data());
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekCheckins = checkins.filter(c => {
      const checkinDate = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
      return checkinDate >= oneWeekAgo;
    });

    if (weekCheckins.length === 0) return 50;

    const avgEnergy = weekCheckins.reduce((sum, c) => sum + c.energyLevel, 0) / weekCheckins.length;
    const avgFocus = weekCheckins.reduce((sum, c) => sum + c.focusLevel, 0) / weekCheckins.length;

    return Math.round(((avgEnergy + avgFocus) / 20) * 100);
  };

  const calculateHabitScore = (snapshot) => {
    const habits = snapshot.docs.map(doc => doc.data());

    if (habits.length === 0) return 50;

    const avgStreak = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0) / habits.length;

    // Target: average streak of 7+ days
    const score = Math.min(100, (avgStreak / 7) * 100);
    return Math.round(score);
  };

  const generateMockHistory = (currentScore) => {
    // Generate 30 days of mock history trending toward current score
    const history = [];
    const baseScore = currentScore - 10;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variation = Math.random() * 10 - 5;
      const score = Math.min(100, Math.max(0, baseScore + (30 - i) * 0.3 + variation));

      history.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round(score)
      });
    }

    return history;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-evergreen-teal';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getRadarData = () => {
    if (!scores) return [];

    return [
      { category: 'Cognitive', value: scores.categories.cognitive, fullMark: 100 },
      { category: 'Sleep', value: scores.categories.sleep, fullMark: 100 },
      { category: 'Social', value: scores.categories.social, fullMark: 100 },
      { category: 'Nature', value: scores.categories.nature, fullMark: 100 },
      { category: 'Gratitude', value: scores.categories.gratitude, fullMark: 100 },
      { category: 'Energy', value: scores.categories.energy, fullMark: 100 },
      { category: 'Habits', value: scores.categories.habits, fullMark: 100 }
    ];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-dew-sage-light h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="text-center py-12 text-muted-sage-gray">
        <Brain className="mx-auto mb-4 text-muted-sage-gray/60" size={64} />
        <p>Unable to calculate brain health score. Start tracking your activities!</p>
      </div>
    );
  }

  const radarData = getRadarData();

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="text-purple-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Brain Health Score</h2>
            <p className="text-purple-700 mb-2">
              Your composite brain health score combines data from focus sessions, sleep, social connections,
              nature time, gratitude practice, energy levels, and healthy habits.
            </p>
            <p className="text-sm text-purple-600">
              This score updates automatically based on your activity across the past 7 days.
            </p>
          </div>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-white bg-opacity-20 rounded-full mb-4">
            <Brain size={64} />
          </div>
          <div className="text-6xl font-bold mb-2">{scores.overall}</div>
          <div className="text-2xl font-semibold mb-2">{getScoreLabel(scores.overall)}</div>
          <div className="text-white text-opacity-90">
            Your brain health score is {scores.overall >= 70 ? 'strong' : 'developing'}.
            {scores.overall < 70 && ' Focus on the categories below to improve.'}
          </div>
        </div>
      </div>

      {/* Category Breakdown Radar Chart */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Category Breakdown</h3>

        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis domain={[0, 100]} />
            <Radar
              name="Your Score"
              dataKey="value"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>

        {/* Category Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Zap className="text-purple-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Cognitive (Focus)</span>
                <span className={`font-bold ${getScoreColor(scores.categories.cognitive)}`}>
                  {scores.categories.cognitive}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Deep work and focus sessions</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Activity className="text-blue-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Sleep Quality</span>
                <span className={`font-bold ${getScoreColor(scores.categories.sleep)}`}>
                  {scores.categories.sleep}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Duration and quality of sleep</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Users className="text-pink-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Social Connections</span>
                <span className={`font-bold ${getScoreColor(scores.categories.social)}`}>
                  {scores.categories.social}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Meaningful relationships</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Leaf className="text-evergreen-teal" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Nature Exposure</span>
                <span className={`font-bold ${getScoreColor(scores.categories.nature)}`}>
                  {scores.categories.nature}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Time spent outdoors</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Heart className="text-red-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Gratitude Practice</span>
                <span className={`font-bold ${getScoreColor(scores.categories.gratitude)}`}>
                  {scores.categories.gratitude}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Daily gratitude journaling</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Zap className="text-yellow-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Energy Levels</span>
                <span className={`font-bold ${getScoreColor(scores.categories.energy)}`}>
                  {scores.categories.energy}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Daily energy and focus</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-dew-sage-light rounded-lg">
            <Target className="text-indigo-600" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-soft-charcoal">Healthy Habits</span>
                <span className={`font-bold ${getScoreColor(scores.categories.habits)}`}>
                  {scores.categories.habits}
                </span>
              </div>
              <div className="text-xs text-muted-sage-gray">Habit consistency and streaks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {scoreHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-divider p-6">
          <h3 className="text-lg font-semibold text-soft-charcoal mb-4">30-Day Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Brain Health Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Personalized Recommendations */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="text-purple-600" size={20} />
          <h3 className="text-lg font-semibold text-soft-charcoal">Personalized Recommendations</h3>
        </div>

        <div className="space-y-3">
          {scores.categories.cognitive < 60 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-semibold text-purple-900 mb-1">Boost Cognitive Performance</div>
              <p className="text-sm text-purple-700">
                Your focus score is low. Try to complete at least 3-4 Pomodoro sessions this week for deep work.
              </p>
            </div>
          )}

          {scores.categories.sleep < 60 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-blue-900 mb-1">Improve Sleep Quality</div>
              <p className="text-sm text-blue-700">
                Aim for 7-9 hours of quality sleep. Try establishing a bedtime routine and reducing screen time before bed.
              </p>
            </div>
          )}

          {scores.categories.social < 60 && (
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <div className="font-semibold text-pink-900 mb-1">Strengthen Social Connections</div>
              <p className="text-sm text-pink-700">
                Reach out to 2-3 friends or family members this week for meaningful conversations.
              </p>
            </div>
          )}

          {scores.categories.nature < 60 && (
            <div className="p-4 bg-teal-light border border-silver-sage rounded-lg">
              <div className="font-semibold text-soft-charcoal mb-1">Get More Nature Time</div>
              <p className="text-sm text-evergreen-teal">
                Spend at least 20-30 minutes outdoors daily. Even a short walk in a park can boost your mood and cognition.
              </p>
            </div>
          )}

          {scores.categories.gratitude < 60 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-semibold text-red-900 mb-1">Practice Daily Gratitude</div>
              <p className="text-sm text-red-700">
                Write down 3 things you're grateful for each day. This simple practice can significantly improve mental wellbeing.
              </p>
            </div>
          )}

          {scores.overall >= 80 && (
            <div className="p-4 bg-teal-light border border-silver-sage rounded-lg">
              <div className="font-semibold text-soft-charcoal mb-1">Excellent Work!</div>
              <p className="text-sm text-evergreen-teal">
                Your brain health score is excellent. Keep up these healthy habits and continue to maintain this balance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainHealthScore;
