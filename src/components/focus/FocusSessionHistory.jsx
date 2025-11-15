// src/components/focus/FocusSessionHistory.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Clock, TrendingUp, Zap, Calendar } from 'lucide-react';

const FocusSessionHistory = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    averageSessionLength: 0,
    todaySessions: 0,
    todayMinutes: 0,
    thisWeekMinutes: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'today' | 'week' | 'month' | 'all'

  useEffect(() => {
    if (userId) {
      fetchSessions();
    }
  }, [userId, timeRange]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const sessionsQuery = query(
        collection(db, 'focusSessions'),
        where('userId', '==', userId),
        where('startedAt', '>=', startDate),
        orderBy('startedAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSessions(sessionsData);
      calculateStats(sessionsData);
    } catch (error) {
      console.error('Error fetching focus sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData) => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(now.getDate() - 7);

    let totalMinutes = 0;
    let todaySessions = 0;
    let todayMinutes = 0;
    let thisWeekMinutes = 0;

    sessionsData.forEach(session => {
      const sessionDate = session.startedAt?.toDate ? session.startedAt.toDate() : new Date(session.startedAt);
      const duration = session.duration || 0;

      totalMinutes += duration;

      if (sessionDate >= todayStart) {
        todaySessions++;
        todayMinutes += duration;
      }

      if (sessionDate >= weekStart) {
        thisWeekMinutes += duration;
      }
    });

    setStats({
      totalSessions: sessionsData.length,
      totalMinutes,
      averageSessionLength: sessionsData.length > 0 ? Math.round(totalMinutes / sessionsData.length) : 0,
      todaySessions,
      todayMinutes,
      thisWeekMinutes
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {['today', 'week', 'month', 'all'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              timeRange === range
                ? 'bg-[#1B5E57] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-purple-600" size={20} />
            <span className="text-xs font-medium text-purple-700 uppercase">Today</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{formatDuration(stats.todayMinutes)}</div>
          <div className="text-xs text-purple-600 mt-1">{stats.todaySessions} sessions</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-600" size={20} />
            <span className="text-xs font-medium text-blue-700 uppercase">This Week</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{formatDuration(stats.thisWeekMinutes)}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-600" size={20} />
            <span className="text-xs font-medium text-green-700 uppercase">Total</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{formatDuration(stats.totalMinutes)}</div>
          <div className="text-xs text-green-600 mt-1">{stats.totalSessions} sessions</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-orange-600" size={20} />
            <span className="text-xs font-medium text-orange-700 uppercase">Average</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">{stats.averageSessionLength}m</div>
          <div className="text-xs text-orange-600 mt-1">per session</div>
        </div>
      </div>

      {/* Session List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Sessions</h3>
        {sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#1B5E57]/30 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    session.type === 'pomodoro' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <Clock className={session.type === 'pomodoro' ? 'text-purple-600' : 'text-blue-600'} size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {session.duration} minute {session.type === 'pomodoro' ? 'Pomodoro' : 'Focus'} session
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(session.startedAt)}
                      {session.interrupted && (
                        <span className="ml-2 text-orange-600 text-xs">(Interrupted)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    session.completed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {session.completed ? '✓ Completed' : 'Incomplete'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Clock className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="font-medium text-gray-700 mb-1">No focus sessions yet</p>
            <p className="text-sm text-gray-500">Start a Pomodoro session to begin tracking</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusSessionHistory;
