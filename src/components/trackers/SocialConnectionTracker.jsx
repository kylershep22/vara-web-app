// src/components/trackers/SocialConnectionTracker.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Users, Heart, Phone, MessageCircle, Coffee, Calendar, TrendingUp, Plus } from 'lucide-react';

const SocialConnectionTracker = ({ userId, compactMode = false }) => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    connectionType: 'conversation',
    withWhom: '',
    duration: 30,
    quality: 4,
    notes: ''
  });

  const connectionTypes = [
    { id: 'conversation', label: 'In-Person Chat', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { id: 'activity', label: 'Shared Activity', icon: Coffee, color: 'from-purple-500 to-pink-500' },
    { id: 'call', label: 'Phone/Video Call', icon: Phone, color: 'from-green-500 to-emerald-500' },
    { id: 'message', label: 'Meaningful Message', icon: MessageCircle, color: 'from-orange-500 to-red-500' }
  ];

  useEffect(() => {
    if (userId) {
      fetchConnections();
    }
  }, [userId]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const connectionsQuery = query(
        collection(db, 'socialConnections'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(compactMode ? 5 : 30)
      );

      const snapshot = await getDocs(connectionsQuery);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setConnections(data);
    } catch (error) {
      console.error('Error fetching social connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async () => {
    if (!userId || !formData.withWhom.trim()) return;

    try {
      await addDoc(collection(db, 'socialConnections'), {
        userId,
        connectionType: formData.connectionType,
        withWhom: formData.withWhom.trim(),
        duration: parseInt(formData.duration),
        quality: formData.quality,
        notes: formData.notes.trim(),
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        connectionType: 'conversation',
        withWhom: '',
        duration: 30,
        quality: 4,
        notes: ''
      });
      setShowForm(false);
      fetchConnections();
    } catch (error) {
      console.error('Error saving social connection:', error);
    }
  };

  const getWeeklyStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyConnections = connections.filter(conn => {
      const connDate = conn.date?.toDate ? conn.date.toDate() : new Date(conn.date);
      return connDate >= oneWeekAgo;
    });

    const totalDuration = weeklyConnections.reduce((sum, conn) => sum + (conn.duration || 0), 0);
    const avgQuality = weeklyConnections.length > 0
      ? (weeklyConnections.reduce((sum, conn) => sum + conn.quality, 0) / weeklyConnections.length).toFixed(1)
      : 0;

    return {
      count: weeklyConnections.length,
      totalDuration,
      avgQuality
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
  const selectedType = connectionTypes.find(t => t.id === formData.connectionType);

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
            <Users className="text-[#1B5E57]" size={20} />
            <h3 className="font-semibold text-gray-900">Social Connections</h3>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Plus size={18} className="text-[#1B5E57]" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-900">{weeklyStats.count}</div>
            <div className="text-xs text-blue-600">This Week</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-900">{weeklyStats.totalDuration}m</div>
            <div className="text-xs text-purple-600">Total Time</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-900">{weeklyStats.avgQuality}/5</div>
            <div className="text-xs text-green-600">Avg Quality</div>
          </div>
        </div>

        {/* Quick Add Form */}
        {showForm && (
          <div className="space-y-3 border-t pt-4">
            <input
              type="text"
              placeholder="Who did you connect with?"
              value={formData.withWhom}
              onChange={(e) => setFormData({ ...formData, withWhom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
            />
            <button
              onClick={saveConnection}
              disabled={!formData.withWhom.trim()}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition ${
                formData.withWhom.trim()
                  ? 'bg-[#1B5E57] text-white hover:bg-[#174C46]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Log Connection
            </button>
          </div>
        )}

        {/* Recent Connections */}
        {connections.length > 0 && (
          <div className="space-y-2">
            {connections.slice(0, 3).map(conn => (
              <div key={conn.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{conn.withWhom}</span>
                  <span className="text-xs text-gray-500">{formatDate(conn.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="text-blue-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Social Connection Tracker</h2>
            <p className="text-blue-700 mb-2">
              Strong social connections are essential for brain health, reducing stress, and increasing longevity.
              Track meaningful interactions to ensure you're nurturing your relationships.
            </p>
            <p className="text-sm text-blue-600">
              Goal: Aim for at least 2-3 quality social connections per week.
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-blue-600" size={24} />
            <span className="text-sm text-gray-600">This Week</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.count}</div>
          <div className="text-sm text-gray-600">Connections</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-purple-600" size={24} />
            <span className="text-sm text-gray-600">Total Time</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.totalDuration}</div>
          <div className="text-sm text-gray-600">Minutes</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-pink-600" size={24} />
            <span className="text-sm text-gray-600">Average Quality</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{weeklyStats.avgQuality}</div>
          <div className="text-sm text-gray-600">out of 5</div>
        </div>
      </div>

      {/* Log New Connection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Log a Connection</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#174C46] transition flex items-center gap-2"
            >
              <Plus size={18} />
              Add Connection
            </button>
          )}
        </div>

        {showForm && (
          <div className="space-y-4">
            {/* Connection Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type of Connection</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {connectionTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, connectionType: type.id })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.connectionType === type.id
                          ? 'border-[#1B5E57] bg-gradient-to-br ' + type.color + ' bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="mx-auto mb-2" size={24} />
                      <div className="text-xs font-medium text-gray-700 text-center">{type.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Who */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Who did you connect with?</label>
              <input
                type="text"
                value={formData.withWhom}
                onChange={(e) => setFormData({ ...formData, withWhom: e.target.value })}
                placeholder="Name or relationship (e.g., Sarah, Mom, College friend)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
              />
            </div>

            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Duration</label>
                <span className="text-lg font-bold text-[#1B5E57]">{formData.duration} minutes</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B5E57]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 min</span>
                <span>3 hours</span>
              </div>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality (How meaningful was this connection?)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setFormData({ ...formData, quality: rating })}
                    className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${
                      formData.quality === rating
                        ? 'border-[#1B5E57] bg-[#1B5E57] text-white'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Brief</span>
                <span>Deep & Meaningful</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                placeholder="What did you talk about? How did it make you feel?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent resize-none"
              />
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
                onClick={saveConnection}
                disabled={!formData.withWhom.trim()}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                  formData.withWhom.trim()
                    ? 'bg-[#1B5E57] text-white hover:bg-[#174C46]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Connections</h3>

        {connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map(conn => {
              const typeInfo = connectionTypes.find(t => t.id === conn.connectionType);
              const Icon = typeInfo?.icon || Users;

              return (
                <div key={conn.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${typeInfo?.color || 'from-gray-400 to-gray-500'}`}>
                      <Icon className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{conn.withWhom}</span>
                        <span className="text-sm text-gray-500">{formatDate(conn.date)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>{typeInfo?.label || conn.connectionType}</span>
                        <span>•</span>
                        <span>{conn.duration} min</span>
                        <span>•</span>
                        <span>Quality: {conn.quality}/5</span>
                      </div>
                      {conn.notes && (
                        <p className="text-sm text-gray-700 italic">{conn.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No connections logged yet. Start tracking your social interactions!</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Meaningful Connections</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Quality over quantity: One deep conversation beats many surface-level chats</li>
          <li>• Schedule regular check-ins with close friends and family</li>
          <li>• Be fully present: Put away devices during conversations</li>
          <li>• Share vulnerabilities: Authentic connection requires openness</li>
          <li>• Reach out first: Don't wait for others to initiate</li>
        </ul>
      </div>
    </div>
  );
};

export default SocialConnectionTracker;
