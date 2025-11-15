// src/components/resilience/EmotionalCheckin.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Smile, TrendingUp, Calendar, Heart } from 'lucide-react';

const EmotionalCheckin = ({ userId }) => {
  const [checkins, setCheckins] = useState([]);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  const emotions = [
    { id: 'joy', label: 'Joy', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: 'from-blue-400 to-cyan-400' },
    { id: 'excited', label: 'Excited', emoji: '🤩', color: 'from-purple-400 to-pink-400' },
    { id: 'grateful', label: 'Grateful', emoji: '🙏', color: 'from-green-400 to-emerald-400' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: 'from-blue-500 to-indigo-500' },
    { id: 'anxious', label: 'Anxious', emoji: '😰', color: 'from-orange-500 to-red-500' },
    { id: 'frustrated', label: 'Frustrated', emoji: '😤', color: 'from-red-500 to-pink-500' },
    { id: 'tired', label: 'Tired', emoji: '😴', color: 'from-gray-400 to-gray-500' },
    { id: 'angry', label: 'Angry', emoji: '😠', color: 'from-red-600 to-orange-600' },
    { id: 'lonely', label: 'Lonely', emoji: '😔', color: 'from-purple-500 to-gray-500' },
    { id: 'content', label: 'Content', emoji: '😊', color: 'from-green-300 to-teal-300' },
    { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵', color: 'from-orange-400 to-red-400' }
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
        collection(db, 'emotionalCheckins'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(30)
      );

      const snapshot = await getDocs(checkinsQuery);
      const checkinsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCheckins(checkinsData);

      // Check if there's a check-in for today
      const today = new Date().toDateString();
      const todaysCheckin = checkinsData.find(c => {
        const checkinDate = c.date?.toDate ? c.date.toDate() : new Date(c.date);
        return checkinDate.toDateString() === today;
      });

      setTodayCheckin(todaysCheckin || null);
    } catch (error) {
      console.error('Error fetching emotional check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCheckin = async () => {
    if (!userId || !selectedEmotion) return;

    try {
      await addDoc(collection(db, 'emotionalCheckins'), {
        userId,
        emotion: selectedEmotion.id,
        emoji: selectedEmotion.emoji,
        label: selectedEmotion.label,
        intensity,
        notes: notes.trim(),
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setSelectedEmotion(null);
      setIntensity(5);
      setNotes('');
      fetchCheckins();
    } catch (error) {
      console.error('Error saving emotional check-in:', error);
    }
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

  const getEmotionStats = () => {
    if (checkins.length === 0) return [];

    const emotionCounts = {};
    checkins.forEach(checkin => {
      emotionCounts[checkin.emotion] = (emotionCounts[checkin.emotion] || 0) + 1;
    });

    return Object.entries(emotionCounts)
      .map(([id, count]) => ({
        ...emotions.find(e => e.id === id),
        count,
        percentage: Math.round((count / checkins.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const topEmotions = getEmotionStats();

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
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Smile className="text-blue-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Emotional Check-In</h2>
            <p className="text-blue-700 mb-2">
              Checking in with your emotions regularly builds emotional awareness and helps you identify patterns.
              All emotions are valid—there are no "good" or "bad" feelings.
            </p>
            <p className="text-sm text-blue-600">
              Take a moment to notice how you're feeling right now. Name it, rate the intensity, and note what might be contributing to it.
            </p>
          </div>
        </div>
      </div>

      {/* Today's Check-in */}
      {!todayCheckin ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How are you feeling right now?</h3>

          {/* Emotion Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {emotions.map(emotion => (
              <button
                key={emotion.id}
                onClick={() => setSelectedEmotion(emotion)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedEmotion?.id === emotion.id
                    ? `border-[#1B5E57] bg-gradient-to-br ${emotion.color} bg-opacity-20`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-1">{emotion.emoji}</div>
                <div className="text-xs font-medium text-gray-700">{emotion.label}</div>
              </button>
            ))}
          </div>

          {selectedEmotion && (
            <div className="space-y-4 animate-fadeIn">
              {/* Intensity Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Intensity</label>
                  <span className="text-2xl font-bold text-[#1B5E57]">{intensity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B5E57]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Subtle</span>
                  <span>Intense</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's contributing to this feeling? (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent resize-none"
                  placeholder="Context, triggers, thoughts..."
                />
              </div>

              {/* Save Button */}
              <button
                onClick={saveCheckin}
                className="w-full px-6 py-3 bg-[#1B5E57] text-white rounded-lg font-semibold hover:bg-[#174C46] transition flex items-center justify-center gap-2"
              >
                <Heart size={20} />
                Save Check-In
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`bg-gradient-to-br ${emotions.find(e => e.id === todayCheckin.emotion)?.color || 'from-gray-400 to-gray-500'} rounded-lg p-6 text-white`}>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-6xl">{todayCheckin.emoji}</div>
            <div>
              <h3 className="text-2xl font-bold">Today's Check-In ✓</h3>
              <p className="text-white/90">You felt <strong>{todayCheckin.label}</strong> at intensity {todayCheckin.intensity}/10</p>
            </div>
          </div>
          {todayCheckin.notes && (
            <div className="mt-4 p-3 bg-white/20 rounded-lg">
              <p className="text-sm">{todayCheckin.notes}</p>
            </div>
          )}
          <p className="text-sm text-white/80 mt-4">Come back tomorrow for your next check-in!</p>
        </div>
      )}

      {/* Emotion Patterns */}
      {topEmotions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-gray-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Your Emotional Patterns</h3>
          </div>

          <div className="space-y-3">
            {topEmotions.map((emotion, idx) => (
              <div key={emotion.id} className="flex items-center gap-4">
                <div className="text-3xl">{emotion.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{emotion.label}</span>
                    <span className="text-sm text-gray-600">{emotion.count} times ({emotion.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${emotion.color}`}
                      style={{ width: `${emotion.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Recent Check-Ins</h3>
        </div>

        {checkins.length > 0 ? (
          <div className="space-y-3">
            {checkins.slice(0, 7).map(checkin => (
              <div key={checkin.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-3xl">{checkin.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{checkin.label}</span>
                    <span className="text-sm text-gray-500">{formatDate(checkin.date)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">Intensity: {checkin.intensity}/10</div>
                  {checkin.notes && (
                    <p className="text-sm text-gray-700 italic">{checkin.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Smile className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No emotional check-ins yet. Start tracking your emotions today!</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Emotional Awareness</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Name it to tame it: Simply labeling emotions reduces their intensity</li>
          <li>• All emotions are information—they tell you what matters to you</li>
          <li>• Emotions aren't permanent; they rise and pass like waves</li>
          <li>• Notice patterns: Do certain emotions show up at certain times or situations?</li>
          <li>• Practice non-judgment: Observe emotions with curiosity, not criticism</li>
        </ul>
      </div>
    </div>
  );
};

export default EmotionalCheckin;
