// src/components/trackers/NatureExposureLogger.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Leaf, Sun, Cloud, CloudRain, Mountain, Trees, Home, MapPin, Calendar, TrendingUp, Plus } from 'lucide-react';

const NatureExposureLogger = ({ userId, compactMode = false }) => {
  const [exposures, setExposures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    duration: 30,
    activity: 'walk',
    location: 'park',
    weather: 'sunny',
    mood: 'refreshed'
  });

  const activities = [
    { id: 'walk', label: 'Walk', icon: '🚶' },
    { id: 'hike', label: 'Hike', icon: '🥾' },
    { id: 'garden', label: 'Gardening', icon: '🌱' },
    { id: 'sit', label: 'Sitting/Relaxing', icon: '🧘' },
    { id: 'exercise', label: 'Outdoor Exercise', icon: '🏃' },
    { id: 'other', label: 'Other Activity', icon: '🌿' }
  ];

  const locations = [
    { id: 'park', label: 'Park', icon: Trees },
    { id: 'forest', label: 'Forest', icon: Mountain },
    { id: 'beach', label: 'Beach', icon: '🏖️' },
    { id: 'backyard', label: 'Backyard/Garden', icon: Home },
    { id: 'trail', label: 'Nature Trail', icon: MapPin },
    { id: 'other', label: 'Other', icon: Leaf }
  ];

  const weathers = [
    { id: 'sunny', label: 'Sunny', icon: Sun, color: 'text-yellow-500' },
    { id: 'cloudy', label: 'Cloudy', icon: Cloud, color: 'text-gray-500' },
    { id: 'rainy', label: 'Rainy', icon: CloudRain, color: 'text-blue-500' }
  ];

  const moods = [
    { id: 'energized', label: 'Energized', emoji: '⚡', color: 'from-yellow-400 to-orange-400' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: 'from-blue-400 to-cyan-400' },
    { id: 'refreshed', label: 'Refreshed', emoji: '✨', color: 'from-green-400 to-emerald-400' },
    { id: 'grounded', label: 'Grounded', emoji: '🌳', color: 'from-green-600 to-teal-600' }
  ];

  useEffect(() => {
    if (userId) {
      fetchExposures();
    }
  }, [userId]);

  const fetchExposures = async () => {
    setLoading(true);
    try {
      const exposuresQuery = query(
        collection(db, 'natureExposure'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(compactMode ? 5 : 30)
      );

      const snapshot = await getDocs(exposuresQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setExposures(data);
    } catch (error) {
      console.error('Error fetching nature exposures:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveExposure = async () => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'natureExposure'), {
        userId,
        duration: parseInt(formData.duration),
        activity: formData.activity,
        location: formData.location,
        weather: formData.weather,
        mood: formData.mood,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        duration: 30,
        activity: 'walk',
        location: 'park',
        weather: 'sunny',
        mood: 'refreshed'
      });
      setShowForm(false);
      fetchExposures();
    } catch (error) {
      console.error('Error saving nature exposure:', error);
    }
  };

  const getWeeklyStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyExposures = exposures.filter(exp => {
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      return expDate >= oneWeekAgo;
    });

    const totalMinutes = weeklyExposures.reduce((sum, exp) => sum + (exp.duration || 0), 0);
    const avgDuration = weeklyExposures.length > 0 ? Math.round(totalMinutes / weeklyExposures.length) : 0;

    return {
      count: weeklyExposures.length,
      totalMinutes,
      avgDuration
    };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const weeklyStats = getWeeklyStats();

  if (loading && !compactMode) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (compactMode) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Leaf className="text-green-600" size={20} />
            <h3 className="font-semibold text-gray-900">Nature Time</h3>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Plus size={18} className="text-green-600" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-900">{weeklyStats.count}</div>
            <div className="text-xs text-green-600">Times This Week</div>
          </div>
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <div className="text-xl font-bold text-emerald-900">{weeklyStats.totalMinutes}m</div>
            <div className="text-xs text-emerald-600">Total Time</div>
          </div>
        </div>

        {/* Quick Add Form */}
        {showForm && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="text-xs text-gray-600">Duration (minutes)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <button
              onClick={saveExposure}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
            >
              Log Nature Time
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Leaf className="text-green-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Nature Exposure Logger</h2>
            <p className="text-green-700 mb-2">
              Time in nature reduces stress, improves mood, enhances creativity, and supports cognitive function.
              Even 20-30 minutes can have measurable benefits for your brain health.
            </p>
            <p className="text-sm text-green-600">
              Goal: Aim for 30+ minutes outdoors daily, or 2+ hours per week.
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-green-600" size={24} />
            <span className="text-sm text-gray-600">This Week</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.count}</div>
          <div className="text-sm text-gray-600">Nature Sessions</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-emerald-600" size={24} />
            <span className="text-sm text-gray-600">Total Time</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.totalMinutes}</div>
          <div className="text-sm text-gray-600">Minutes</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="text-teal-600" size={24} />
            <span className="text-sm text-gray-600">Average Session</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.avgDuration}</div>
          <div className="text-sm text-gray-600">Minutes</div>
        </div>
      </div>

      {/* Log New Exposure */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Log Nature Time</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Plus size={18} />
              Add Entry
            </button>
          )}
        </div>

        {showForm && (
          <div className="space-y-4">
            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Duration</label>
                <span className="text-lg font-bold text-green-600">{formData.duration} minutes</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 min</span>
                <span>3 hours</span>
              </div>
            </div>

            {/* Activity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {activities.map(activity => (
                  <button
                    key={activity.id}
                    onClick={() => setFormData({ ...formData, activity: activity.id })}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      formData.activity === activity.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{activity.icon}</div>
                    <div className="text-xs font-medium text-gray-700">{activity.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {locations.map(loc => {
                  const Icon = typeof loc.icon === 'string' ? null : loc.icon;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setFormData({ ...formData, location: loc.id })}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        formData.location === loc.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {Icon ? <Icon size={18} /> : <span className="text-lg">{loc.icon}</span>}
                      <span className="text-sm font-medium text-gray-700">{loc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weather */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weather</label>
              <div className="flex gap-3">
                {weathers.map(weather => {
                  const Icon = weather.icon;
                  return (
                    <button
                      key={weather.id}
                      onClick={() => setFormData({ ...formData, weather: weather.id })}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        formData.weather === weather.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={weather.color} size={20} />
                      <span className="text-sm font-medium text-gray-700">{weather.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood After */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">How did you feel after?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {moods.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => setFormData({ ...formData, mood: mood.id })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.mood === mood.id
                        ? 'border-green-600 bg-gradient-to-br ' + mood.color + ' bg-opacity-20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs font-medium text-gray-700">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveExposure}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Save Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Nature Time</h3>

        {exposures.length > 0 ? (
          <div className="space-y-3">
            {exposures.map(exp => {
              const activity = activities.find(a => a.id === exp.activity);
              const location = locations.find(l => l.id === exp.location);
              const weather = weathers.find(w => w.id === exp.weather);
              const mood = moods.find(m => m.id === exp.mood);
              const WeatherIcon = weather?.icon || Sun;

              return (
                <div key={exp.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activity?.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{activity?.label || exp.activity}</div>
                        <div className="text-sm text-gray-600">{location?.label || exp.location}</div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(exp.date)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">{exp.duration} minutes</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <WeatherIcon size={14} className={weather?.color} />
                      <span>{weather?.label}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span>{mood?.emoji}</span>
                      <span>Felt {mood?.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Leaf className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No nature time logged yet. Get outside and start tracking!</p>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h3 className="font-semibold text-emerald-900 mb-2">Benefits of Nature Exposure</h3>
        <ul className="text-sm text-emerald-700 space-y-1">
          <li>• Reduces cortisol (stress hormone) by up to 21%</li>
          <li>• Improves focus and attention span</li>
          <li>• Boosts creativity and problem-solving</li>
          <li>• Enhances mood and reduces anxiety/depression</li>
          <li>• Strengthens immune function and reduces inflammation</li>
          <li>• Provides vitamin D for brain health (when sunny)</li>
        </ul>
      </div>
    </div>
  );
};

export default NatureExposureLogger;
