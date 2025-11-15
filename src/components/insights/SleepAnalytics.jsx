// src/components/insights/SleepAnalytics.jsx

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Moon, TrendingUp, Calendar, Award, AlertCircle } from 'lucide-react';

const SleepAnalytics = ({ userId }) => {
  const [sleepLogs, setSleepLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    avgHours: 0,
    avgQuality: 'N/A',
    bestNight: 0,
    worstNight: 0,
    consistency: 0,
    sleepDebt: 0
  });
  const [timeRange, setTimeRange] = useState(30); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchSleepAnalytics();
    }
  }, [userId, timeRange]);

  const fetchSleepAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - timeRange);

      const logsQuery = query(
        collection(db, 'sleepLogs'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(logsQuery);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSleepLogs(logsData);

      // Calculate stats
      if (logsData.length > 0) {
        const totalHours = logsData.reduce((sum, log) => sum + log.hoursSlept, 0);
        const avgHours = (totalHours / logsData.length).toFixed(1);

        const hours = logsData.map(log => log.hoursSlept);
        const bestNight = Math.max(...hours);
        const worstNight = Math.min(...hours);

        // Calculate quality distribution
        const qualityCounts = { excellent: 0, good: 0, fair: 0, poor: 0 };
        logsData.forEach(log => qualityCounts[log.quality]++);
        const avgQuality = Object.entries(qualityCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // Calculate consistency (lower variance = more consistent)
        const variance = hours.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / hours.length;
        const stdDev = Math.sqrt(variance);
        const consistency = Math.max(0, 100 - Math.round(stdDev * 20)); // Convert to 0-100 scale

        // Calculate sleep debt (assuming 7.5h target)
        const targetHours = 7.5;
        const sleepDebt = Math.max(0, (targetHours * logsData.length) - totalHours).toFixed(1);

        setStats({
          totalLogs: logsData.length,
          avgHours,
          avgQuality: avgQuality.charAt(0).toUpperCase() + avgQuality.slice(1),
          bestNight,
          worstNight,
          consistency,
          sleepDebt
        });
      }
    } catch (error) {
      console.error('Error fetching sleep analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'from-green-500 to-emerald-500';
      case 'good': return 'from-blue-500 to-cyan-500';
      case 'fair': return 'from-yellow-500 to-orange-500';
      case 'poor': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getQualityBadge = (quality) => {
    const colors = {
      excellent: 'bg-green-100 text-green-700',
      good: 'bg-blue-100 text-blue-700',
      fair: 'bg-yellow-100 text-yellow-700',
      poor: 'bg-red-100 text-red-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[quality] || 'bg-gray-100 text-gray-700'}`}>
        {quality}
      </span>
    );
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="text-indigo-600" size={20} />
            <span className="text-xs font-medium text-indigo-700 uppercase">Avg Sleep</span>
          </div>
          <div className="text-3xl font-bold text-indigo-900">{stats.avgHours}h</div>
          <div className="text-xs text-indigo-600 mt-1">Last {timeRange} days</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-purple-600" size={20} />
            <span className="text-xs font-medium text-purple-700 uppercase">Avg Quality</span>
          </div>
          <div className="text-2xl font-bold text-purple-900 capitalize">{stats.avgQuality}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-600" size={20} />
            <span className="text-xs font-medium text-green-700 uppercase">Consistency</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{stats.consistency}%</div>
          <div className="text-xs text-green-600 mt-1">Sleep schedule</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-orange-600" size={20} />
            <span className="text-xs font-medium text-orange-700 uppercase">Sleep Debt</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{stats.sleepDebt}h</div>
          <div className="text-xs text-orange-600 mt-1">vs. 7.5h target</div>
        </div>
      </div>

      {/* Sleep Debt Alert */}
      {stats.sleepDebt > 5 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h3 className="font-semibold text-red-900">Sleep Debt Detected</h3>
              <p className="text-sm text-red-700">
                You're {stats.sleepDebt} hours behind on sleep. Prioritize rest this week to recover and protect your cognitive performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Sleep Trend</h3>
        </div>

        {sleepLogs.length > 0 ? (
          <div className="space-y-2">
            {sleepLogs.map((log, idx) => {
              const percentage = (log.hoursSlept / 10) * 100; // Scale to 10h max for visual

              return (
                <div key={log.id} className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 min-w-[80px]">
                    {formatDate(log.date)}
                  </div>

                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full bg-gradient-to-r ${getQualityColor(log.quality)} flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {log.hoursSlept}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[80px]">
                    {getQualityBadge(log.quality)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Moon className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No sleep logs yet. Start tracking your sleep to see trends!</p>
          </div>
        )}
      </div>

      {/* Quality Distribution */}
      {sleepLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Quality Distribution</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['excellent', 'good', 'fair', 'poor'].map(quality => {
              const count = sleepLogs.filter(log => log.quality === quality).length;
              const percentage = Math.round((count / sleepLogs.length) * 100);

              return (
                <div key={quality} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{count}</div>
                  <div className="text-xs text-gray-600 capitalize mb-2">{quality}</div>
                  <div className="text-lg font-semibold text-gray-700">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best & Worst Nights */}
      {sleepLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="text-green-600" size={20} />
              <h3 className="font-semibold text-green-900">Best Night</h3>
            </div>
            <div className="text-4xl font-bold text-green-900 mb-2">{stats.bestNight}h</div>
            <p className="text-sm text-green-700">Your longest sleep in this period</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="text-orange-600" size={20} />
              <h3 className="font-semibold text-orange-900">Shortest Night</h3>
            </div>
            <div className="text-4xl font-bold text-orange-900 mb-2">{stats.worstNight}h</div>
            <p className="text-sm text-orange-700">Your shortest sleep in this period</p>
          </div>
        </div>
      )}

      {/* Insights */}
      {sleepLogs.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Sleep Insights</h3>
          <div className="space-y-2 text-sm text-indigo-700">
            <p>
              • You've logged <strong>{stats.totalLogs}</strong> sleep entries averaging <strong>{stats.avgHours} hours</strong> per night.
            </p>
            <p>
              • Most common quality: <strong>{stats.avgQuality}</strong>.
              {stats.avgQuality === 'Excellent' && ' Keep up the great sleep hygiene!'}
              {stats.avgQuality === 'Good' && ' Solid sleep quality—optimize further for excellence.'}
              {(stats.avgQuality === 'Fair' || stats.avgQuality === 'Poor') && ' Focus on improving sleep quality through better routines.'}
            </p>
            <p>
              • Your sleep consistency is <strong>{stats.consistency}%</strong>.
              {stats.consistency >= 80 && ' Excellent! Consistent sleep times build strong circadian rhythms.'}
              {stats.consistency >= 60 && stats.consistency < 80 && ' Good, but more consistency would help.'}
              {stats.consistency < 60 && ' Try sticking to a more consistent sleep schedule.'}
            </p>
            {stats.avgHours < 7 && (
              <p className="text-red-700 font-semibold">
                • ⚠️ You're averaging less than 7 hours—this can impair cognitive function, mood, and health. Prioritize sleep!
              </p>
            )}
            {stats.avgHours >= 7 && stats.avgHours < 9 && (
              <p className="text-green-700 font-semibold">
                • ✓ You're in the optimal 7-9 hour range for brain health and cognitive performance.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sleepLogs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Moon className="mx-auto mb-3 text-gray-300" size={64} />
          <h3 className="font-semibold text-gray-700 mb-2">No Sleep Data Yet</h3>
          <p className="text-gray-500 mb-4">
            Start logging your sleep in the Fuel & Recovery section to track trends and optimize your rest.
          </p>
        </div>
      )}
    </div>
  );
};

export default SleepAnalytics;
