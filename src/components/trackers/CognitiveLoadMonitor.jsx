// src/components/trackers/CognitiveLoadMonitor.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Zap, Battery, BatteryLow, BatteryFull, Clock, TrendingUp, AlertCircle, Plus } from 'lucide-react';

const CognitiveLoadMonitor = ({ userId, compactMode = false }) => {
  const [checkins, setCheckins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    energyLevel: 7,
    focusLevel: 7,
    mood: 'motivated',
    activity: 'work',
    notes: ''
  });

  const moods = [
    { id: 'energized', label: 'Energized', emoji: '⚡', color: 'from-yellow-400 to-orange-400' },
    { id: 'tired', label: 'Tired', emoji: '😴', color: 'from-muted-sage-gray/60 to-muted-sage-gray' },
    { id: 'stressed', label: 'Stressed', emoji: '😰', color: 'from-red-400 to-pink-400' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: 'from-blue-400 to-cyan-400' },
    { id: 'motivated', label: 'Motivated', emoji: '🔥', color: 'from-orange-400 to-red-400' },
    { id: 'distracted', label: 'Distracted', emoji: '😵‍💫', color: 'from-purple-400 to-pink-400' }
  ];

  const activities = [
    { id: 'work', label: 'Deep Work' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'exercise', label: 'Exercise' },
    { id: 'rest', label: 'Rest/Break' },
    { id: 'social', label: 'Social' },
    { id: 'learning', label: 'Learning' }
  ];

  useEffect(() => {
    if (userId) {
      fetchCheckins();
    }
  }, [userId]);

  const fetchCheckins = async () => {
    setLoading(true);
    try {
      const checkinsQuery = query(
        collection(db, 'energyCheckins'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(compactMode ? 5 : 100)
      );

      const snapshot = await getDocs(checkinsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCheckins(data);
    } catch (error) {
      console.error('Error fetching energy check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCheckin = async () => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'energyCheckins'), {
        userId,
        energyLevel: formData.energyLevel,
        focusLevel: formData.focusLevel,
        mood: formData.mood,
        activity: formData.activity,
        notes: formData.notes.trim(),
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        energyLevel: 7,
        focusLevel: 7,
        mood: 'motivated',
        activity: 'work',
        notes: ''
      });
      setShowForm(false);
      fetchCheckins();
    } catch (error) {
      console.error('Error saving energy check-in:', error);
    }
  };

  const getPeakHours = () => {
    if (checkins.length < 5) return null;

    const hourlyData = {};
    checkins.forEach(checkin => {
      const timestamp = checkin.timestamp?.toDate ? checkin.timestamp.toDate() : new Date(checkin.timestamp);
      const hour = timestamp.getHours();

      if (!hourlyData[hour]) {
        hourlyData[hour] = { total: 0, count: 0 };
      }
      hourlyData[hour].total += (checkin.energyLevel + checkin.focusLevel) / 2;
      hourlyData[hour].count += 1;
    });

    const averages = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      avg: data.total / data.count
    }));

    averages.sort((a, b) => b.avg - a.avg);

    return averages.slice(0, 3).map(h => {
      const isPM = h.hour >= 12;
      const displayHour = h.hour > 12 ? h.hour - 12 : (h.hour === 0 ? 12 : h.hour);
      return `${displayHour}${isPM ? 'pm' : 'am'}`;
    });
  };

  const getHeatmapData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const heatmap = hours.map(hour => {
      const hourCheckins = checkins.filter(c => {
        const timestamp = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
        return timestamp.getHours() === hour;
      });

      if (hourCheckins.length === 0) return { hour, level: 0 };

      const avgEnergy = hourCheckins.reduce((sum, c) => sum + ((c.energyLevel + c.focusLevel) / 2), 0) / hourCheckins.length;
      return { hour, level: avgEnergy };
    });

    return heatmap;
  };

  const getHeatmapColor = (level) => {
    if (level === 0) return 'bg-dew-sage-light';
    if (level < 3) return 'bg-red-200';
    if (level < 5) return 'bg-orange-200';
    if (level < 7) return 'bg-yellow-200';
    if (level < 9) return 'bg-silver-sage';
    return 'bg-evergreen-teal';
  };

  const getTodayAverage = () => {
    const today = new Date().toDateString();
    const todayCheckins = checkins.filter(c => {
      const timestamp = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
      return timestamp.toDateString() === today;
    });

    if (todayCheckins.length === 0) return null;

    const avgEnergy = todayCheckins.reduce((sum, c) => sum + c.energyLevel, 0) / todayCheckins.length;
    const avgFocus = todayCheckins.reduce((sum, c) => sum + c.focusLevel, 0) / todayCheckins.length;

    return { energy: avgEnergy.toFixed(1), focus: avgFocus.toFixed(1), count: todayCheckins.length };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const peakHours = getPeakHours();
  const heatmapData = getHeatmapData();
  const todayAvg = getTodayAverage();
  const selectedMood = moods.find(m => m.id === formData.mood);

  if (loading && !compactMode) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-dew-sage-light h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (compactMode) {
    return (
      <div className="bg-white rounded-xl border border-divider p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-500" size={20} />
            <h3 className="font-semibold text-soft-charcoal">Energy Level</h3>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition"
          >
            <Plus size={18} className="text-yellow-500" />
          </button>
        </div>

        {todayAvg && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-900">{todayAvg.energy}</div>
              <div className="text-xs text-yellow-600">Avg Energy</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-900">{todayAvg.focus}</div>
              <div className="text-xs text-blue-600">Avg Focus</div>
            </div>
          </div>
        )}

        {/* Quick Check-in Form */}
        {showForm && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs text-muted-sage-gray">Energy: {formData.energyLevel}/10</label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.energyLevel}
                onChange={(e) => setFormData({ ...formData, energyLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-divider rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
            <button
              onClick={saveCheckin}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium text-sm"
            >
              Log Check-in
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Zap className="text-yellow-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">Cognitive Load Monitor</h2>
            <p className="text-yellow-700 mb-2">
              Track your energy and focus levels throughout the day to identify your peak performance hours
              and patterns. Use this data to schedule important tasks during your high-energy windows.
            </p>
            <p className="text-sm text-yellow-600">
              Check in regularly to build an accurate picture of your cognitive rhythms.
            </p>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      {todayAvg && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-divider p-6">
            <div className="flex items-center gap-3 mb-2">
              <Battery className="text-yellow-600" size={24} />
              <span className="text-sm text-muted-sage-gray">Today's Energy</span>
            </div>
            <div className="text-3xl font-bold text-soft-charcoal">{todayAvg.energy}/10</div>
            <div className="text-sm text-muted-sage-gray">{todayAvg.count} check-ins</div>
          </div>
          <div className="bg-white rounded-xl border border-divider p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-blue-600" size={24} />
              <span className="text-sm text-muted-sage-gray">Today's Focus</span>
            </div>
            <div className="text-3xl font-bold text-soft-charcoal">{todayAvg.focus}/10</div>
            <div className="text-sm text-muted-sage-gray">Average level</div>
          </div>
          <div className="bg-white rounded-xl border border-divider p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-purple-600" size={24} />
              <span className="text-sm text-muted-sage-gray">Peak Hours</span>
            </div>
            <div className="text-lg font-bold text-soft-charcoal">
              {peakHours ? peakHours.join(', ') : 'Need more data'}
            </div>
            <div className="text-sm text-muted-sage-gray">Best performance</div>
          </div>
        </div>
      )}

      {/* Quick Check-in */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-soft-charcoal">Energy Check-In</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition flex items-center gap-2"
            >
              <Plus size={18} />
              Quick Check-in
            </button>
          )}
        </div>

        {showForm && (
          <div className="space-y-4">
            {/* Energy Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-soft-charcoal">Energy Level</label>
                <span className="text-2xl font-bold text-yellow-600">{formData.energyLevel}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.energyLevel}
                onChange={(e) => setFormData({ ...formData, energyLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-divider rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-muted-sage-gray mt-1">
                <span>Exhausted</span>
                <span>Fully Energized</span>
              </div>
            </div>

            {/* Focus Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-soft-charcoal">Focus Level</label>
                <span className="text-2xl font-bold text-blue-600">{formData.focusLevel}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.focusLevel}
                onChange={(e) => setFormData({ ...formData, focusLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-divider rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-muted-sage-gray mt-1">
                <span>Very Distracted</span>
                <span>Laser Focused</span>
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-soft-charcoal mb-2">Current Mood</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {moods.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => setFormData({ ...formData, mood: mood.id })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.mood === mood.id
                        ? 'border-yellow-500 bg-gradient-to-br ' + mood.color + ' bg-opacity-20'
                        : 'border-divider hover:border-silver-sage'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs font-medium text-soft-charcoal">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div>
              <label className="block text-sm font-medium text-soft-charcoal mb-2">What are you doing?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {activities.map(activity => (
                  <button
                    key={activity.id}
                    onClick={() => setFormData({ ...formData, activity: activity.id })}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      formData.activity === activity.id
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                        : 'border-divider hover:border-silver-sage text-soft-charcoal'
                    }`}
                  >
                    {activity.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-soft-charcoal mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                placeholder="Any observations about your energy or focus..."
                className="w-full px-4 py-3 border border-silver-sage rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-6 py-3 border border-silver-sage rounded-lg font-semibold hover:bg-dew-sage-light transition"
              >
                Cancel
              </button>
              <button
                onClick={saveCheckin}
                className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition"
              >
                Save Check-in
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time-of-Day Heatmap */}
      {checkins.length >= 5 && (
        <div className="bg-white rounded-xl border border-divider p-6">
          <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Energy Heatmap (24-Hour View)</h3>
          <p className="text-sm text-muted-sage-gray mb-4">
            This heatmap shows your average energy/focus levels by hour. Darker green = higher performance.
          </p>

          <div className="grid grid-cols-12 gap-1">
            {heatmapData.map(({ hour, level }) => {
              const isPM = hour >= 12;
              const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

              return (
                <div key={hour} className="text-center">
                  <div
                    className={`h-12 rounded ${getHeatmapColor(level)} transition-all hover:scale-110 cursor-pointer`}
                    title={`${displayHour}${isPM ? 'pm' : 'am'}: ${level > 0 ? level.toFixed(1) : 'No data'}/10`}
                  ></div>
                  <div className="text-xs text-muted-sage-gray mt-1">
                    {displayHour}{isPM ? 'p' : 'a'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-sage-gray">
            <span>Low</span>
            <div className="h-4 w-4 bg-red-200 rounded"></div>
            <div className="h-4 w-4 bg-orange-200 rounded"></div>
            <div className="h-4 w-4 bg-yellow-200 rounded"></div>
            <div className="h-4 w-4 bg-silver-sage rounded"></div>
            <div className="h-4 w-4 bg-evergreen-teal rounded"></div>
            <span>High</span>
          </div>
        </div>
      )}

      {/* Insights */}
      {peakHours && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Performance Insights</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your peak performance hours are: <strong>{peakHours.join(', ')}</strong></li>
                <li>• Schedule your most important or challenging tasks during these windows</li>
                <li>• Use lower-energy hours for routine tasks, meetings, or breaks</li>
                <li>• Track patterns to optimize your daily schedule</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">Recent Check-Ins</h3>

        {checkins.length > 0 ? (
          <div className="space-y-3">
            {checkins.slice(0, 10).map(checkin => {
              const mood = moods.find(m => m.id === checkin.mood);
              const activity = activities.find(a => a.id === checkin.activity);

              return (
                <div key={checkin.id} className="p-4 bg-dew-sage-light rounded-lg border border-divider">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{mood?.emoji || '💭'}</span>
                      <div>
                        <div className="font-medium text-soft-charcoal">{mood?.label || checkin.mood}</div>
                        <div className="text-sm text-muted-sage-gray">{activity?.label || checkin.activity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-sage-gray">{formatDate(checkin.timestamp)}</div>
                      <div className="text-xs text-muted-sage-gray">{formatTime(checkin.timestamp)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Battery className="text-yellow-600" size={14} />
                      <span className="text-muted-sage-gray">Energy:</span>
                      <span className="font-semibold text-soft-charcoal">{checkin.energyLevel}/10</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="text-blue-600" size={14} />
                      <span className="text-muted-sage-gray">Focus:</span>
                      <span className="font-semibold text-soft-charcoal">{checkin.focusLevel}/10</span>
                    </div>
                  </div>
                  {checkin.notes && (
                    <p className="text-sm text-soft-charcoal mt-2 italic">{checkin.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-sage-gray">
            <Zap className="mx-auto mb-2 text-silver-sage" size={48} />
            <p>No check-ins yet. Start tracking your energy levels!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitiveLoadMonitor;
