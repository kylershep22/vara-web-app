// src/components/resilience/GratitudePractice.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Heart, Plus, Calendar, TrendingUp, Sparkles } from 'lucide-react';

const GratitudePractice = ({ userId }) => {
  const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [gratitudeItems, setGratitudeItems] = useState(['', '', '']);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchGratitudeEntries();
    }
  }, [userId]);

  const fetchGratitudeEntries = async () => {
    setLoading(true);
    try {
      const gratitudeQuery = query(
        collection(db, 'gratitudeEntries'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(30)
      );

      const snapshot = await getDocs(gratitudeQuery);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGratitudeEntries(entries);

      // Check if there's an entry for today
      const today = new Date().toDateString();
      const todaysEntry = entries.find(e => {
        const entryDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return entryDate.toDateString() === today;
      });

      setTodayEntry(todaysEntry || null);

      // Calculate streak
      calculateStreak(entries);
    } catch (error) {
      console.error('Error fetching gratitude entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (entries) => {
    if (entries.length === 0) {
      setStreak(0);
      return;
    }

    let streakCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a set of date strings
    const dateStrings = new Set(
      entries.map(e => {
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    );

    // Check streak
    let checkDate = new Date(today);
    while (dateStrings.has(checkDate.getTime())) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    setStreak(streakCount);
  };

  const saveGratitudeEntry = async () => {
    if (!userId) return;

    const validItems = gratitudeItems.filter(item => item.trim() !== '');
    if (validItems.length === 0) return;

    try {
      await addDoc(collection(db, 'gratitudeEntries'), {
        userId,
        items: validItems,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setGratitudeItems(['', '', '']);
      fetchGratitudeEntries();
    } catch (error) {
      console.error('Error saving gratitude entry:', error);
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
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-pink-100 rounded-lg">
            <Heart className="text-pink-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-pink-900 mb-2">Daily Gratitude Practice</h2>
            <p className="text-pink-700 mb-3">
              Research shows that practicing gratitude rewires your brain for positivity, reduces stress,
              improves relationships, and increases overall well-being.
            </p>
            <p className="text-sm text-pink-600">
              Take 2 minutes each day to write down 3 things you're grateful for. The more specific, the better.
            </p>
          </div>
        </div>
      </div>

      {/* Streak Display */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="text-orange-600" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-orange-900">{streak} Day Gratitude Streak</h3>
              <p className="text-orange-700">You're building a powerful resilience habit. Keep it going!</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Gratitude Entry */}
      {!todayEntry ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-[#1B5E57]" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Today's Gratitude</h3>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            What are 3 things you're grateful for today? They can be big or small.
          </p>

          <div className="space-y-3">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-3 w-6 h-6 rounded-full bg-[#1B5E57] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {idx + 1}
                </div>
                <textarea
                  value={gratitudeItems[idx]}
                  onChange={(e) => {
                    const newItems = [...gratitudeItems];
                    newItems[idx] = e.target.value;
                    setGratitudeItems(newItems);
                  }}
                  placeholder="I'm grateful for..."
                  rows="2"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent resize-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveGratitudeEntry}
            disabled={gratitudeItems.every(item => item.trim() === '')}
            className={`mt-4 w-full px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              gratitudeItems.every(item => item.trim() === '')
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-[#1B5E57] text-white hover:bg-[#174C46]'
            }`}
          >
            <Heart size={20} />
            Save Today's Gratitude
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-green-600" size={20} />
            <h3 className="text-lg font-semibold text-green-900">Today's Gratitude ✓</h3>
          </div>
          <div className="space-y-2">
            {todayEntry.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-1 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-gray-900">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-green-700 mt-4">Come back tomorrow to continue your practice!</p>
        </div>
      )}

      {/* Past Entries */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-gray-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">Gratitude Journal</h3>
        </div>

        {gratitudeEntries.length > 0 ? (
          <div className="space-y-4">
            {gratitudeEntries.slice(0, 10).map(entry => (
              <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-500 mb-2">{formatDate(entry.date)}</div>
                <div className="space-y-1">
                  {entry.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Heart className="text-pink-500 mt-1 flex-shrink-0" size={14} />
                      <p className="text-gray-900 text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Heart className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No gratitude entries yet. Start your practice today!</p>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-purple-600" size={20} />
          <h3 className="font-semibold text-purple-900">Why Gratitude Works</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
          <div>
            <h4 className="font-semibold mb-1">Mental Health</h4>
            <ul className="space-y-1">
              <li>• Reduces depression and anxiety</li>
              <li>• Increases positive emotions</li>
              <li>• Improves self-esteem</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Physical Health</h4>
            <ul className="space-y-1">
              <li>• Better sleep quality</li>
              <li>• Stronger immune system</li>
              <li>• Reduced stress hormones</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Relationships</h4>
            <ul className="space-y-1">
              <li>• Deeper connections</li>
              <li>• More empathy and compassion</li>
              <li>• Better conflict resolution</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Resilience</h4>
            <ul className="space-y-1">
              <li>• Faster recovery from setbacks</li>
              <li>• Greater psychological strength</li>
              <li>• More optimistic outlook</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Deeper Practice</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Be specific: "My partner made me coffee this morning" vs. "My partner"</li>
          <li>• Include people: Gratitude for relationships is especially powerful</li>
          <li>• Mix it up: Don't repeat the same things every day</li>
          <li>• Feel it: Pause and actually feel the gratitude, don't just list items</li>
          <li>• Notice surprises: Things that were unexpected or could have gone differently</li>
        </ul>
      </div>
    </div>
  );
};

export default GratitudePractice;
