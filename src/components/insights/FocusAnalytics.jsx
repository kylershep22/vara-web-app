// src/components/insights/FocusAnalytics.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Zap, Clock, TrendingUp, Calendar, Target } from 'lucide-react';

const FocusAnalytics = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    avgSessionLength: 0,
    thisWeekMinutes: 0,
    completedSessions: 0,
    completionRate: 0
  });
  const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month' | 'all'
  const [hourlyDistribution, setHourlyDistribution] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchFocusAnalytics();
    }
  }, [userId, timeRange]);

  const fetchFocusAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const sessionsQuery = query(
        collection(db, 'focusSessions'),
        where('userId', '==', userId),
        where('startedAt', '>=', startDate),
        orderBy('startedAt', 'desc')
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSessions(sessionsData);

      // Calculate stats
      const totalMinutes = sessionsData.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgSessionLength = sessionsData.length > 0
        ? Math.round(totalMinutes / sessionsData.length)
        : 0;

      const weekStart = new Date();
      weekStart.setDate(now.getDate() - 7);
      const thisWeekSessions = sessionsData.filter(s => {
        const sessionDate = s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt);
        return sessionDate >= weekStart;
      });
      const thisWeekMinutes = thisWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      const completedSessions = sessionsData.filter(s => s.completed).length;
      const completionRate = sessionsData.length > 0
        ? Math.round((completedSessions / sessionsData.length) * 100)
        : 0;

      setStats({
        totalSessions: sessionsData.length,
        totalMinutes,
        avgSessionLength,
        thisWeekMinutes,
        completedSessions,
        completionRate
      });

      // Calculate hourly distribution (peak productivity hours)
      const hourCounts = {};
      sessionsData.forEach(session => {
        const sessionDate = session.startedAt?.toDate ? session.startedAt.toDate() : new Date(session.startedAt);
        const hour = sessionDate.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      setHourlyDistribution(hourCounts);
    } catch (error) {
      console.error('Error fetching focus analytics:', error);
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

  const getPeakHours = () => {
    const hours = Object.entries(hourlyDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return hours.map(([hour, count]) => {
      const hourNum = parseInt(hour);
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      return `${displayHour}${period} (${count} sessions)`;
    });
  };

  const peakHours = getPeakHours();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-dew-sage-light h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center gap-2">
        {['week', 'month', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
              timeRange === range
                ? 'bg-evergreen-teal text-white'
                : 'bg-dew-sage-light text-soft-charcoal hover:bg-silver-sage/30'
            }`}
          >
            {range === 'all' ? 'All Time' : `This ${range}`}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-purple-600" size={20} />
            <span className="text-xs font-medium text-purple-700 uppercase">Total Sessions</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">{stats.totalSessions}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-blue-600" size={20} />
            <span className="text-xs font-medium text-blue-700 uppercase">Total Time</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{formatDuration(stats.totalMinutes)}</div>
        </div>

        <div className="bg-gradient-to-br from-teal-light to-dew-sage rounded-lg p-4 border border-silver-sage">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-evergreen-teal" size={20} />
            <span className="text-xs font-medium text-evergreen-teal uppercase">Completion Rate</span>
          </div>
          <div className="text-3xl font-bold text-evergreen-teal">{stats.completionRate}%</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-orange-600" size={20} />
            <span className="text-xs font-medium text-orange-700 uppercase">Avg Session</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{stats.avgSessionLength}m</div>
        </div>
      </div>

      {/* This Week Highlight */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Calendar className="text-indigo-600" size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-indigo-900">{formatDuration(stats.thisWeekMinutes)} This Week</h3>
            <p className="text-indigo-700">Keep up the focused work! Consistency builds momentum.</p>
          </div>
        </div>
      </div>

      {/* Peak Productivity Hours */}
      {peakHours.length > 0 && (
        <div className="bg-white rounded-xl border border-divider p-6">
          <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Your Peak Productivity Hours</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {peakHours.map((hour, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-900 mb-1">#{idx + 1}</div>
                <div className="text-sm text-orange-700">{hour}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-sage-gray mt-4">
            Schedule your most important work during these hours when you're naturally most focused.
          </p>
        </div>
      )}

      {/* Session Type Breakdown */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Session Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Type */}
          <div>
            <h4 className="font-medium text-soft-charcoal mb-3">By Session Type</h4>
            {['pomodoro', 'focus', 'short break', 'long break'].map(type => {
              const typeSessions = sessions.filter(s => s.type === type);
              const percentage = stats.totalSessions > 0
                ? Math.round((typeSessions.length / stats.totalSessions) * 100)
                : 0;

              return (
                <div key={type} className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-soft-charcoal">{type}</span>
                    <span className="font-medium text-soft-charcoal">{typeSessions.length} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-silver-sage/30 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* By Duration */}
          <div>
            <h4 className="font-medium text-soft-charcoal mb-3">By Duration Range</h4>
            {[
              { label: '< 15 min', min: 0, max: 15 },
              { label: '15-30 min', min: 15, max: 30 },
              { label: '30-60 min', min: 30, max: 60 },
              { label: '60+ min', min: 60, max: Infinity }
            ].map(range => {
              const rangeSessions = sessions.filter(s =>
                s.duration >= range.min && s.duration < range.max
              );
              const percentage = stats.totalSessions > 0
                ? Math.round((rangeSessions.length / stats.totalSessions) * 100)
                : 0;

              return (
                <div key={range.label} className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-soft-charcoal">{range.label}</span>
                    <span className="font-medium text-soft-charcoal">{rangeSessions.length} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-silver-sage/30 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-evergreen-teal to-evergreen-teal"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Recent Sessions</h3>

        {sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.slice(0, 10).map(session => {
              const sessionDate = session.startedAt?.toDate ? session.startedAt.toDate() : new Date(session.startedAt);

              return (
                <div key={session.id} className="flex items-center justify-between p-3 border border-divider rounded-lg hover:border-evergreen-teal transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      session.type === 'pomodoro' ? 'bg-purple-100' :
                      session.type === 'focus' ? 'bg-blue-100' :
                      'bg-dew-sage'
                    }`}>
                      <Zap className={
                        session.type === 'pomodoro' ? 'text-purple-600' :
                        session.type === 'focus' ? 'text-blue-600' :
                        'text-evergreen-teal'
                      } size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-soft-charcoal capitalize">
                        {session.duration} minute {session.type || 'focus'} session
                      </div>
                      <div className="text-sm text-muted-sage-gray">
                        {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.completed
                      ? 'bg-dew-sage text-evergreen-teal'
                      : 'bg-dew-sage-light text-muted-sage-gray'
                  }`}>
                    {session.completed ? '✓ Completed' : 'Incomplete'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-sage-gray">
            <Zap className="mx-auto mb-2 text-muted-sage-gray/60" size={48} />
            <p>No focus sessions yet. Start a Pomodoro session to begin tracking!</p>
          </div>
        )}
      </div>

      {/* Insights */}
      {stats.totalSessions > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-3">Focus Insights</h3>
          <div className="space-y-2 text-sm text-purple-700">
            <p>
              • You've completed <strong>{stats.totalSessions}</strong> focus sessions totaling <strong>{formatDuration(stats.totalMinutes)}</strong>.
            </p>
            <p>
              • Your average session length is <strong>{stats.avgSessionLength} minutes</strong>.
              {stats.avgSessionLength >= 45 && ' Great for deep work!'}
              {stats.avgSessionLength >= 25 && stats.avgSessionLength < 45 && ' Perfect Pomodoro length.'}
              {stats.avgSessionLength < 25 && ' Consider longer sessions for deeper focus.'}
            </p>
            <p>
              • Your completion rate is <strong>{stats.completionRate}%</strong>.
              {stats.completionRate >= 80 && ' Excellent discipline!'}
              {stats.completionRate < 80 && ' Try setting more realistic durations.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusAnalytics;
